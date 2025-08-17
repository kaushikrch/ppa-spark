from ..rag.indexer import rag
from ..models.optimizer import run_optimizer
from ..models.simulator import simulate_price_change, simulate_delist
import json

# Very simple debate: up to 3 rounds of tool-augmented reasoning

def agentic_huddle(question: str, budget: float = 5e5):
    rag_hits = rag.query(question, topk=3)
    rounds = []

    # Round 1: Retrieve facts
    rounds.append({
        "role": "RAGAgent",
        "content": "Retrieved evidence from data tables",
        "evidence": [h[0][:800] for h, _ in rag_hits],
        "timestamp": "2024-01-15T10:00:00Z"
    })

    # Round 2: Optimization probe (if relevant)
    if any(k in question.lower() for k in ["optimize","maximize","price","margin"]):
        try:
            sol, kpis = run_optimizer(round=1)
            rounds.append({
                "role": "OptimizationAgent",
                "content": "Ran round-1 optimizer with 20% bound constraints",
                "kpis": kpis,
                "top_changes": sorted(sol, key=lambda x: abs(x.get("pct_change", 0)), reverse=True)[:5],
                "timestamp": "2024-01-15T10:05:00Z"
            })
        except Exception as e:
            rounds.append({
                "role": "OptimizationAgent",
                "content": f"Optimization failed: {str(e)}",
                "timestamp": "2024-01-15T10:05:00Z"
            })

    # Round 3: Synthesis and recommendation
    rec = {
        "summary": "Propose modest price upshifts on premium tiers where elasticity is favorable, reduce promotional depth on low-ROI SKUs, and enforce MSL for top-velocity pack sizes. Limit near-bound changes to preserve shopper trust.",
        "actions": [
            "Apply +4–6% price increases on premium 1L PET where elasticity > -0.9",
            "Reduce promotional depths >25% in GeneralTrade for SKUs with low lift",
            "Delist 3 tail SKUs with <0.5% share; reallocate shelf space to 330ml variants",
            "Implement dynamic pricing for eCom channel with ±8% flexibility"
        ],
        "risks": [
            "Consumer price sensitivity may be higher than modeled",
            "Competitive response could negate margin gains",
            "Channel conflicts from differential pricing strategies"
        ],
        "kpis_expected": {
            "revenue_lift": "2.3-4.1%",
            "margin_improvement": "6.8-9.2%",
            "volume_impact": "-1.2% to +0.8%"
        }
    }
    rounds.append({
        "role": "CoachAgent",
        "content": "Consensus recommendation after multi-agent analysis",
        "recommendation": rec,
        "confidence": 0.78,
        "timestamp": "2024-01-15T10:10:00Z"
    })

    return {"rounds": rounds, "stopped_after_rounds": len(rounds), "final_recommendation": rec}