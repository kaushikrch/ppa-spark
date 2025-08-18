from typing import Dict, Any, List
from .llm import chat_json
from .policies import ACTION_SCHEMA, AGENT_PERSONAS, ROUND_SCRIPT
from ..rag.store import rag
from ..models.scorer import evaluate_plan, pick_best
from ..models.optimizer import run_optimizer
from ..schemas import HuddleResponse, PlanJSON

def _prompt(agent_name: str, question: str, round_label: str, context_blobs: List[str]) -> List[Dict[str,str]]:
    persona = AGENT_PERSONAS[agent_name]
    sys = persona["system"] + "\n" + ACTION_SCHEMA + "\n" + ROUND_SCRIPT[round_label]
    user = f"Question: {question}\n\nContext (top tables):\n" + "\n---\n".join(context_blobs[:3]) + "\n\nReturn ONLY JSON."
    return [{"role":"system","content":sys},{"role":"user","content":user}]

def _make_fallback_plan(question: str, budget: float) -> Dict[str, Any]:
    # Build a small actionable plan directly from optimizer output
    sol, kpis = run_optimizer(spend_budget=float(budget), round=1)
    top = sorted(sol, key=lambda r: r.get("margin", 0.0), reverse=True)[:5]
    actions = []
    for r in top:
        sid = str(r.get("sku_id", "unknown"))
        pct = float(r.get("pct_change", 0.0))
        actions.append({
            "action_type": "price_change",
            "target_type": "sku",
            "ids": [sid],
            "magnitude_pct": pct,
            "constraints": ["near-bound ≤10% estate-wide", "respect guardrails"],
            "expected_impact": {"margin": float(r.get("margin", 0.0))},
            "risks": ["shopper trust if >8% for Core"],
            "confidence": 0.6,
            "evidence_refs": ["TABLE:price_weekly","TABLE:elasticities"]
        })
    return {
        "plan_name": "Optimizer-backed fallback",
        "assumptions": [f"Budget ≤ {budget}", "Round-1 bounds ±20%"],
        "actions": actions,
        "rationale": "LLM unavailable or timed out; returning optimizer-backed actions."
    }

def agentic_huddle_v2(question: str, budget: float = 5e5, debate_rounds: int = 3) -> Dict[str, Any]:
    hits = rag.query(question, topk=4)
    context = [h["text"] for h in hits]
    transcript: List[Dict[str, Any]] = []
    error_msg: str | None = None
    candidates: List[Dict[str, Any]] = []

    try:
        # Round 1: Diverse proposals
        for name in ["Demand","Assortment","PPA","TradeSpend","Optimization"]:
            p = AGENT_PERSONAS[name]
            out = chat_json(_prompt(name, question, "R1", context), temperature=p["temperature"], top_p=p["top_p"])
            if "__error__" in out:
                error_msg = (error_msg or "") + f"[{name}:{out['__error__']}] "
            elif out:
                candidates.append({"agent": name, "plan": out})
            transcript.append({"role":name, "round":"R1", "content":"proposed", "plan": out})

        # If nobody proposed -> early fallback
        if not candidates:
            fb = _make_fallback_plan(question, budget)
            return HuddleResponse(
                stopped_after_rounds=1,
                transcript=transcript,
                final=PlanJSON(**fb),
                citations=[{"table":h["table"], "score":h["score"], "snippet":h["text"][:500]} for h in hits],
                error=error_msg
            ).model_dump()

        # Quantify and shortlist top 3
        scored = []
        for c in candidates:
            kpis, diag = evaluate_plan(c["plan"])
            scored.append({**c, "kpis": kpis, "diag": diag})
        scored = sorted(scored, key=lambda x: x["kpis"].get("risk_adjusted_margin",-1e9), reverse=True)[:3]
        transcript.append({"role":"System","round":"R2","content":"quantified_top3","plans":[{"agent":s["agent"],"kpis":s["kpis"],"diag":s["diag"]} for s in scored]})

        # Optimizer probe (respect budget)
        try:
            _, opt_kpis = run_optimizer(spend_budget=float(budget), round=1)
            transcript.append({"role":"Optimization","round":"R2","content":"optimizer_probe","kpis":opt_kpis})
        except Exception as e:
            error_msg = (error_msg or "") + f"[optimizer_probe:{e}] "

        # Round 2: refinement from top 2
        refined = []
        for s in scored[:2]:
            name = s["agent"]
            p = AGENT_PERSONAS[name]
            out = chat_json(
                _prompt(name, question + f"\n\nObserved KPIs: {s['kpis']}\nDiagnostics:{s['diag']}\nBudget: {budget}\nImprove risk-adjusted margin and feasibility.", "R2", context),
                temperature=p["temperature"], top_p=p["top_p"]
            )
            if "__error__" in out:
                error_msg = (error_msg or "") + f"[{name}_refine:{out['__error__']}] "
            elif out:
                rkpis, rdiag = evaluate_plan(out)
                refined.append({"agent": name, "plan": out, "kpis": rkpis, "diag": rdiag})
            transcript.append({"role":name, "round":"R2","content":"refined", "plan": out})

        # Select final
        pool = refined if refined else scored
        best_idx = pick_best([p["plan"] for p in pool]) if pool else -1
        final_plan = pool[best_idx]["plan"] if best_idx >= 0 else _make_fallback_plan(question, budget)

        return HuddleResponse(
            stopped_after_rounds=3,
            transcript=transcript,
            final=PlanJSON(**final_plan) if isinstance(final_plan, dict) else PlanJSON.model_validate(final_plan),
            citations=[{"table":h["table"], "score":h["score"], "snippet":h["text"][:500]} for h in hits],
            error=error_msg
        ).model_dump()

    except Exception as e:
        # Total failure → hard fallback with error note
        fb = _make_fallback_plan(question, budget)
        return HuddleResponse(
            stopped_after_rounds=0,
            transcript=transcript,
            final=PlanJSON(**fb),
            citations=[{"table":h["table"], "score":h["score"], "snippet":h["text"][:500]} for h in hits],
            error=f"fatal:{e}"
        ).model_dump()

# Keep old function for backward compatibility
def agentic_huddle(question: str, budget: float = 5e5):
    return agentic_huddle_v2(question, budget)