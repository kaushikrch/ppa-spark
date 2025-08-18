import re
from typing import Literal, List

Intent = Literal[
    "DELISTING",
    "ENLISTING",
    "PPA_GAPS",
    "CANNIBALIZATION",
    "PRICING_OPTIMIZATION",
    "PROMO",
    "MSL",
    "SUMMARY",
    "SIMULATION",
]

# Simple, transparent rule-based intent classifier

def classify_intent(q: str) -> Intent:
    s = q.lower()
    if any(k in s for k in ["delist", "remove", "tail", "underperform", "rationaliz"]):
        return "DELISTING"
    if any(k in s for k in ["enlist", "launch", "add", "introduce", "new sku", "npi", "innovation"]):
        return "ENLISTING"
    if any(k in s for k in ["gap", "ladder", "price-pack", "ppa", "price per ml", "ppml"]):
        return "PPA_GAPS"
    if any(k in s for k in ["cannibal", "duplication", "overlap", "substitution"]):
        return "CANNIBALIZATION"
    if any(k in s for k in ["optimize", "maximize", "price move", "pricing", "margin target"]):
        return "PRICING_OPTIMIZATION"
    if any(k in s for k in ["promo", "promotion", "roi", "depth", "discount"]):
        return "PROMO"
    if any(k in s for k in ["msl", "must stock", "distribution", "shelf share"]):
        return "MSL"
    if any(k in s for k in ["simulate", "what if", "scenario"]):
        return "SIMULATION"
    return "SUMMARY"


def expand_queries(intent: Intent, question: str) -> List[str]:
    base = question.strip()
    expansions = [base]
    if intent == "DELISTING":
        expansions += [
            base + " low velocity tail skus volume share <1%",
            "TABLE:sku_master tail skus declining trend channel wise",
            "TABLE:demand_weekly volume share sku_id rolling mean tail",
        ]
    elif intent == "ENLISTING":
        expansions += [
            base + " price pack gap opportunities",
            "TABLE:sku_master pack_size new launch feasibility price_per_ml",
            "TABLE:attributes_importance new variant features",
        ]
    elif intent == "PPA_GAPS":
        expansions += [
            base + " price per ml gaps by channel and pack size",
            "TABLE:price_weekly price_per_ml distribution",
        ]
    elif intent == "CANNIBALIZATION":
        expansions += [
            base + " cross elasticity within brand and across brands",
            "TABLE:elasticities cross_elasticity sku pairs",
        ]
    elif intent == "PRICING_OPTIMIZATION":
        expansions += [
            base + " elasticities and guardrails",
            "TABLE:elasticities own and cross price elasticities",
        ]
    elif intent == "PROMO":
        expansions += [
            base + " promo roi and duplication",
            "TABLE:price_weekly promo depth lift baseline",
        ]
    elif intent == "MSL":
        expansions += [
            base + " distribution and shelf share by region",
            "TABLE:sku_master msl must stock list region",
        ]
    elif intent == "SIMULATION":
        expansions += [
            base + " simulate price change impact",
            "TABLE:elasticities own cross elasticity",
        ]
    else:
        expansions += [
            base + " executive summary risks mitigations",
            "TABLE:elasticities portfolio overview",
        ]
    # Deduplicate while preserving order
    seen = set()
    uniq = []
    for e in expansions:
        if e not in seen:
            uniq.append(e)
            seen.add(e)
    return uniq
