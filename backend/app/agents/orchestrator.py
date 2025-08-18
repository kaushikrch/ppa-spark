from typing import Dict, Any, List
from .llm import chat_json
from .policies import ACTION_SCHEMA, AGENT_PERSONAS, ROUND_SCRIPT
from ..rag.indexer import rag
from ..models.scorer import evaluate_plan, pick_best
from ..models.optimizer import run_optimizer

def _prompt(agent_name: str, question: str, round_label: str, context_blobs: List[str]) -> List[Dict[str,str]]:
    persona = AGENT_PERSONAS[agent_name]
    sys = persona["system"] + "\n" + ACTION_SCHEMA + "\n" + ROUND_SCRIPT[round_label]
    user = f"Question: {question}\n\nContext (top tables):\n" + "\n---\n".join(context_blobs[:3]) + "\n\nReturn ONLY JSON."
    return [{"role":"system","content":sys},{"role":"user","content":user}]

def agentic_huddle_v2(question: str, budget: float = 5e5, debate_rounds: int = 3) -> Dict[str, Any]:
    hits = rag.query(question, topk=3)
    context = [h[0] for h in hits]
    transcript = []
    candidates: List[Dict[str, Any]] = []

    # Round 1: Diverse proposals
    for name in ["Demand","Assortment","PPA","TradeSpend","Optimization"]:
        p = AGENT_PERSONAS[name]
        msgs = _prompt(name, question, "R1", context)
        out = chat_json(msgs, temperature=p["temperature"], top_p=p["top_p"])
        if out:
            candidates.append({"agent": name, "plan": out})
            transcript.append({"role":name, "round":"R1", "content":"proposed", "plan": out})

    # Quantify and shortlist top 3
    scored = []
    for c in candidates:
        kpis, diag = evaluate_plan(c["plan"])
        scored.append({**c, "kpis": kpis, "diag": diag})
    scored = sorted(scored, key=lambda x: x["kpis"].get("risk_adjusted_margin",-1e9), reverse=True)[:3]
    transcript.append({"role":"System","round":"R2","content":"quantified_top3","plans":[{"agent":s["agent"],"kpis":s["kpis"],"diag":s["diag"]} for s in scored]})

    # Optimizer probe (respect budget if provided)
    try:
        _, opt_kpis = run_optimizer(spend_budget=float(budget), round=1)
        transcript.append({"role":"Optimization","round":"R2","content":"optimizer_probe","kpis":opt_kpis})
    except Exception:
        pass

    # Round 2: refinement from top 2
    refined = []
    for s in scored[:2]:
        name = s["agent"]
        p = AGENT_PERSONAS[name]
        msgs = _prompt(
            name,
            question + f"\n\nObserved KPIs: {s['kpis']}\nDiagnostics:{s['diag']}\nBudget: {budget}\nImprove risk-adjusted margin and feasibility.",
            "R2",
            context
        )
        out = chat_json(msgs, temperature=p["temperature"], top_p=p["top_p"])
        if out:
            rkpis, rdiag = evaluate_plan(out)
            refined.append({"agent": name, "plan": out, "kpis": rkpis, "diag": rdiag})
            transcript.append({"role":name, "round":"R2","content":"refined", "plan": out, "kpis": rkpis, "diag": rdiag})

    # Risk critique
    risk_msgs = [
      {"role":"system","content":AGENT_PERSONAS["Risk"]["system"] + "\nCritique each refined plan."},
      {"role":"user","content":"Refined plans:\n" + str([{"agent":r["agent"],"kpis":r["kpis"]} for r in refined]) + "\nReturn JSON: {agent: [risks...]}"}
    ]
    risk_out = chat_json(risk_msgs, temperature=AGENT_PERSONAS["Risk"]["temperature"], top_p=AGENT_PERSONAS["Risk"]["top_p"])
    transcript.append({"role":"Risk","round":"R2","content":"critique","risks": risk_out})

    # Coach picks final
    pool = refined if refined else scored
    pool_plans = [p["plan"] for p in pool]
    best_idx = pick_best(pool_plans)
    best = pool[best_idx] if best_idx>=0 else (scored[0] if scored else None)

    coach_msgs = [
      {"role":"system","content":AGENT_PERSONAS["Coach"]["system"] + "\n" + ACTION_SCHEMA + "\n" + ROUND_SCRIPT["R3"]},
      {"role":"user","content":f"Pick one and finalize. Candidates: {str([{'agent':p['agent'],'kpis':p['kpis']} for p in pool])}\nRisks:{risk_out}\nReturn ONLY JSON."}
    ]
    final_json = chat_json(coach_msgs, temperature=AGENT_PERSONAS["Coach"]["temperature"], top_p=AGENT_PERSONAS["Coach"]["top_p"])

    return {
      "stopped_after_rounds": 3,
      "transcript": transcript,
      "final": final_json,
      "citations": [h[0][:500] for h in hits]
    }

# Keep old function for backward compatibility
def agentic_huddle(question: str, budget: float = 5e5):
    return agentic_huddle_v2(question, budget)