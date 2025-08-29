from typing import Dict, Any, List
from concurrent.futures import ThreadPoolExecutor, as_completed

from .llm import chat_json
from .policies import ACTION_SCHEMA, AGENT_PERSONAS, ROUND_SCRIPT
from ..rag.store import rag
from ..models.scorer import evaluate_plan, pick_best, annotate_expected_impacts
from ..models.optimizer import run_optimizer
from ..schemas import HuddleResponse, PlanJSON

def _prompt(agent_name: str, question: str, round_label: str, context_blobs: List[str]) -> List[Dict[str,str]]:
    persona = AGENT_PERSONAS[agent_name]
    sys = persona["system"] + "\n" + ACTION_SCHEMA + "\n" + ROUND_SCRIPT[round_label]
    user = f"Question: {question}\n\nContext (top tables):\n" + "\n---\n".join(context_blobs[:3]) + "\n\nReturn ONLY JSON."
    return [{"role":"system","content":sys},{"role":"user","content":user}]


def _make_fallback_plan(question: str, budget: float) -> Dict[str, Any]:
    """Return a conservative plan when agents or optimizer fail.

    Tries to run the optimizer for a data-backed plan but gracefully falls back
    to an empty placeholder when the optimizer cannot run (e.g. missing tables
    during deployment smoke tests).
    """
    actions: List[Dict[str, Any]] = []
    plan_name = "Optimizer-backed fallback"
    rationale = "LLM unavailable or timed out; returning optimizer-backed actions."
    try:
        # Constrain optimizer to return quickly during cold starts or tests
        import os
        os.environ.setdefault("OPTIMIZER_TIME_LIMIT", "5")
        os.environ.setdefault("OPTIMIZER_MAX_SKUS", "50")
        sol, _ = run_optimizer(spend_budget=float(budget), round=1)
        top = sorted(
            sol,
            key=lambda r: r.get("margin") or -1e9,
            reverse=True,
        )[:5]
        for r in top:
            sid = str(r.get("sku_id", "unknown"))
            pct_raw = r.get("pct_change")
            pct = float(pct_raw) if pct_raw is not None else 0.0
            margin_raw = r.get("margin")
            margin = float(margin_raw) if margin_raw is not None else 0.0
            actions.append(
                {
                    "action_type": "price_change",
                    "target_type": "sku",
                    "ids": [sid],
                    "magnitude_pct": pct,
                    "constraints": [
                        "near-bound ≤10% estate-wide",
                        "respect guardrails",
                    ],
                    "expected_impact": {"margin": margin},
                    "risks": ["shopper trust if >8% for Core"],
                    "confidence": 0.6,
                    "evidence_refs": ["TABLE:price_weekly", "TABLE:elasticities"],
                }
            )
    except Exception:
        plan_name = "Optimizer fallback"
        rationale = "LLM and optimizer unavailable; returning placeholder actions."

    return {
        "plan_name": plan_name,
        "assumptions": [f"Budget ≤ {budget}", "Round-1 bounds ±20%"],
        "actions": actions,
        "rationale": rationale,
    }


def agentic_huddle_v2(
    question: str,
    budget: float = 5e5,
    debate_rounds: int = 3,
) -> Dict[str, Any]:
    # Hard cap to 3 rounds of debate to keep deliberation bounded
    debate_rounds = min(debate_rounds, 3)
    error_msg: str | None = None
    try:
        if not getattr(rag, "docs", []):
            rag.build()
        hits = rag.query(question, topk=4)
    except Exception:
        hits = []
        error_msg = "Some data sources were unavailable; results may be limited."
    context = [h["text"] for h in hits]
    transcript: List[Dict[str, Any]] = []
    candidates: List[Dict[str, Any]] = []

    try:
        # Round 1 - run agents in parallel to reduce overall latency
        names = ["Demand", "Assortment", "PPA", "TradeSpend", "Optimization"]
        with ThreadPoolExecutor(max_workers=len(names)) as pool:
            fut_to_name = {}
            for name in names:
                p = AGENT_PERSONAS[name]
                prompt = _prompt(name, question, "R1", context)
                fut = pool.submit(
                    chat_json,
                    prompt,
                    temperature=p["temperature"],
                    top_p=p["top_p"],
                )
                fut_to_name[fut] = name
            for fut in as_completed(fut_to_name):
                name = fut_to_name[fut]
                try:
                    out = fut.result()
                except Exception as e:
                    out = {"__error__": str(e)}
                if "__error__" in out:
                    error_msg = (error_msg or "") + f"[{name}:{out['__error__']}] "
                elif out:
                    candidates.append({"agent": name, "plan": out})
                transcript.append({"role": name, "round": "R1", "content": "proposed", "plan": out})

        if not candidates:
            fb = _make_fallback_plan(question, budget)
            annotate_expected_impacts(fb)
            return HuddleResponse(
                stopped_after_rounds=1,
                transcript=transcript,
                final=PlanJSON(**fb),
                citations=[{"table":h["table"], "score":h["score"], "snippet":h["text"][:500]} for h in hits],
                error=error_msg
            ).model_dump()

        # Quantify & shortlist
        scored = []
        for c in candidates:
            kpis, diag = evaluate_plan(c["plan"])
            scored.append({**c, "kpis": kpis, "diag": diag})
        scored = sorted(scored, key=lambda x: x["kpis"].get("risk_adjusted_margin",-1e9), reverse=True)[:3]
        transcript.append({"role":"System","round":"R2","content":"quantified_top3","plans":[{"agent":s["agent"],"kpis":s["kpis"],"diag":s["diag"]} for s in scored]})

        # Optimizer probe
        try:
            _, opt_kpis = run_optimizer(spend_budget=float(budget), round=1)
            transcript.append({"role":"Optimization","round":"R2","content":"optimizer_probe","kpis":opt_kpis})
        except Exception as e:
            error_msg = (error_msg or "") + f"[optimizer_probe:{e}] "

        if debate_rounds < 3:
            pool = scored
            best_idx = pick_best([s["plan"] for s in pool]) if pool else -1
            final_plan = pool[best_idx]["plan"] if best_idx >= 0 else _make_fallback_plan(question, budget)
            annotate_expected_impacts(final_plan)
            return HuddleResponse(
                stopped_after_rounds=debate_rounds,
                transcript=transcript,
                final=PlanJSON(**final_plan)
                if isinstance(final_plan, dict)
                else PlanJSON.model_validate(final_plan),
                citations=[
                    {"table": h["table"], "score": h["score"], "snippet": h["text"][:500]}
                    for h in hits
                ],
                error=error_msg,
            ).model_dump()

        # Round 2 refine - parallelize refinements
        refined = []
        subset = scored[:2]
        if subset:
            with ThreadPoolExecutor(max_workers=len(subset)) as pool:
                fut_to_ctx = {}
                for s in subset:
                    name = s["agent"]
                    p = AGENT_PERSONAS[name]
                    prompt = _prompt(
                        name,
                        question
                        + f"\n\nObserved KPIs: {s['kpis']}\nDiagnostics:{s['diag']}\nBudget: {budget}\nImprove risk-adjusted margin and feasibility.",
                        "R2",
                        context,
                    )
                    fut = pool.submit(
                        chat_json,
                        prompt,
                        temperature=p["temperature"],
                        top_p=p["top_p"],
                    )
                    fut_to_ctx[fut] = (name, s)
                for fut in as_completed(fut_to_ctx):
                    name, s = fut_to_ctx[fut]
                    try:
                        out = fut.result()
                    except Exception as e:
                        out = {"__error__": str(e)}
                    if "__error__" in out:
                        error_msg = (error_msg or "") + f"[{name}_refine:{out['__error__']}] "
                    elif out:
                        rkpis, rdiag = evaluate_plan(out)
                        refined.append({"agent": name, "plan": out, "kpis": rkpis, "diag": rdiag})
                    transcript.append({"role": name, "round": "R2", "content": "refined", "plan": out})

        pool = refined if refined else scored
        best_idx = pick_best([p["plan"] for p in pool]) if pool else -1
        final_plan = pool[best_idx]["plan"] if best_idx >= 0 else _make_fallback_plan(question, budget)
        annotate_expected_impacts(final_plan)

        return HuddleResponse(
            stopped_after_rounds=debate_rounds,
            transcript=transcript,
            final=PlanJSON(**final_plan)
            if isinstance(final_plan, dict)
            else PlanJSON.model_validate(final_plan),
            citations=[
                {"table": h["table"], "score": h["score"], "snippet": h["text"][:500]}
                for h in hits
            ],
            error=error_msg,
        ).model_dump()

    except Exception as e:
        fb = _make_fallback_plan(question, budget)
        annotate_expected_impacts(fb)
        return HuddleResponse(
            stopped_after_rounds=0,
            transcript=transcript,
            final=PlanJSON(**fb),
            citations=[{"table":h["table"], "score":h["score"], "snippet":h["text"][:500]} for h in hits],
            error=f"fatal:{e}"
        ).model_dump()

def agentic_huddle(question: str, budget: float = 5e5):
    return agentic_huddle_v2(question, budget)
