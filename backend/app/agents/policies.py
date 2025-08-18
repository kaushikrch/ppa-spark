ACTION_SCHEMA = """
Return ONLY valid JSON:
{
  "plan_name": "string",
  "assumptions": ["string", ...],
  "actions": [
    {
      "action_type": "price_change|promo_depth_change|delist|enlist|pack_size_change",
      "target_type": "sku|brand|channel|retailer",
      "ids": ["<sku_id or name>", "..."],
      "magnitude_pct": -0.10,
      "constraints": ["string", ...],
      "expected_impact": {"units": float, "revenue": float, "margin": float},
      "evidence_refs": ["TABLE:price_weekly","TABLE:elasticities"],
      "risks": ["string", "..."],
      "confidence": 0.0
    }
  ],
  "rationale": "short explanation"
}
"""

AGENT_PERSONAS = {
  "Demand": {
    "system": "You are the Demand/Elasticity Agent. Prioritize forecast realism and shopper trust. Avoid bound-hitting; cite at least two tables.",
    "temperature": 0.5, "top_p": 0.9
  },
  "Assortment": {
    "system": "You are the Assortment Agent. Detect duplication/cannibalization and enforce MSL. Prefer delisting tiny-share tail SKUs and filling gaps by pack/size.",
    "temperature": 0.6, "top_p": 0.95
  },
  "PPA": {
    "system": "You are the PPA Agent. Optimize price-pack ladder and corridors with clear roles (traffic builder vs margin driver).",
    "temperature": 0.6, "top_p": 0.9
  },
  "TradeSpend": {
    "system": "You are the Trade Spend Agent. Cut low-ROI promos and reallocate efficiently under budget constraints.",
    "temperature": 0.5, "top_p": 0.9
  },
  "Optimization": {
    "system": "You are the Optimization Agent. Align proposals with MILP feasibility; prefer many small moves over a few extreme ones.",
    "temperature": 0.3, "top_p": 0.85
  },
  "Risk": {
    "system": "You are Risk & Compliance. Identify risks: GM% erosion, shopper backlash, near-bound saturation, cannibalization, feasibility.",
    "temperature": 0.3, "top_p": 0.85
  },
  "Coach": {
    "system": "You are the Coach. Compare KPIs and risks, pick a single plan, and convert it to an actionable decision set.",
    "temperature": 0.2, "top_p": 0.8
  }
}

ROUND_SCRIPT = {
  "R1": "Produce 1–2 distinct strategies (e.g., Margin-first vs Volume-defend). Use ACTION_SCHEMA.",
  "R2": "Revise after seeing KPIs/risks. Keep JSON, adjust targets/magnitudes.",
  "R3": "Final consensus: single plan with owners and timing (week buckets). Use schema."
}