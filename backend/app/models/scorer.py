from typing import Dict, List, Tuple, Any
import pandas as pd
import numpy as np
from ..utils.io import engine
from ..bootstrap import bootstrap_if_needed
from ..models.simulator import simulate_price_change, simulate_delist

def _latest_price_and_base():
    bootstrap_if_needed()
    con = engine().connect()
    price = pd.read_sql("select * from price_weekly", con)
    demand = pd.read_sql("select * from demand_weekly", con)
    costs = pd.read_sql("select * from costs", con)
    elast = pd.read_sql("select * from elasticities", con)
    recent_w = price.week.max()
    p = price[price.week>=recent_w-8].groupby("sku_id").net_price.mean().rename("p0")
    u = demand[demand.week>=recent_w-8].groupby("sku_id").units.mean().rename("u0")
    df = pd.concat([p, u], axis=1).reset_index().merge(costs, on="sku_id", how="left").merge(elast, on="sku_id", how="left")
    df["own_elast"] = df["own_elast"].fillna(-1.0)
    return df

def evaluate_plan(plan: Dict[str, Any]) -> Tuple[Dict[str, float], Dict[str, int]]:
    """
    Evaluate a plan -> KPIs & diagnostics.
    Price changes call the simulator; delists call the delist simulator.
    """
    pct_changes = {}
    delists = []
    near_bound_hits = 0
    for a in plan.get("actions", []):
        t = a.get("action_type")
        ids = a.get("ids", [])
        mag = float(a.get("magnitude_pct", 0.0))
        if t == "price_change":
            for sid in ids:
                try:
                    sid_int = int(str(sid))
                    pct_changes[sid_int] = mag
                    if abs(mag) >= 0.9 * 0.20:  # use 20% as round-1 bound heuristic
                        near_bound_hits += 1
                except:
                    continue
        elif t == "delist":
            for sid in ids:
                try: 
                    delists.append(int(str(sid)))
                except: 
                    continue

    kpi_total = {"units": 0.0, "revenue": 0.0, "margin": 0.0}
    if pct_changes:
        agg, _ = simulate_price_change({k: v for k,v in pct_changes.items()})
        kpi_total["units"] += float(agg["units"].mean())
        kpi_total["revenue"] += float(agg["revenue"].mean())
        kpi_total["margin"] += float(agg["margin"].mean())

    if delists:
        keep = simulate_delist(delists)
        if not keep.empty:
            kpi_total["units"] += float(keep["units"].sum())
            kpi_total["revenue"] += float((keep["units"] * 1.0).sum())
            kpi_total["margin"] += float((keep.get("units",0) * 0.2).sum())

    n_actions = len(plan.get("actions", []))
    risk_pen = 0.02 * near_bound_hits + 0.005 * n_actions
    kpi_total["risk_adjusted_margin"] = kpi_total["margin"] * (1 - risk_pen)
    diag = {"near_bound_hits": near_bound_hits, "n_actions": n_actions}
    return kpi_total, diag


def annotate_expected_impacts(plan: Dict[str, Any]) -> Dict[str, Any]:
    """Populate ``expected_impact`` for each action in a plan.

    Uses a lightweight elasticity-based estimate from the most recent
    price/volume baseline.  Only ``price_change`` and ``delist`` actions are
    handled; other action types are left unchanged.  The function mutates the
    incoming ``plan`` dictionary and also returns it for convenience.
    """

    try:
        base = _latest_price_and_base().set_index("sku_id")
    except Exception:
        # If we cannot load the baseline, leave impacts empty
        return plan

    for action in plan.get("actions", []):
        impacts = {"units": 0.0, "revenue": 0.0, "margin": 0.0}
        ids = action.get("ids", [])
        t = action.get("action_type")
        mag = float(action.get("magnitude_pct", 0.0))

        if t == "price_change":
            for sid in ids:
                try:
                    sid_int = int(str(sid))
                    row = base.loc[sid_int]
                    p0 = row["p0"]
                    u0 = row["u0"]
                    c = row["cogs_per_unit"] + row["logistics_per_unit"]
                    e = row["own_elast"]
                except Exception:
                    continue

                new_p = p0 * (1.0 + mag)
                own_factor = np.exp(e * np.log(max(new_p, 0.01) / max(p0, 0.01)))
                new_u = u0 * own_factor
                new_rev = new_p * new_u
                new_m = (new_p - c) * new_u

                base_rev = p0 * u0
                base_m = (p0 - c) * u0

                impacts["units"] += float(new_u - u0)
                impacts["revenue"] += float(new_rev - base_rev)
                impacts["margin"] += float(new_m - base_m)

        elif t == "delist":
            for sid in ids:
                try:
                    sid_int = int(str(sid))
                    row = base.loc[sid_int]
                    p0 = row["p0"]
                    u0 = row["u0"]
                    c = row["cogs_per_unit"] + row["logistics_per_unit"]
                except Exception:
                    continue

                impacts["units"] -= float(u0)
                impacts["revenue"] -= float(p0 * u0)
                impacts["margin"] -= float((p0 - c) * u0)

        # Only set if we computed something meaningful
        if any(abs(v) > 1e-9 for v in impacts.values()):
            action["expected_impact"] = impacts

    return plan

def pick_best(plans: List[Dict[str, Any]]) -> int:
    scores = []
    for p in plans:
        kpis, _ = evaluate_plan(p)
        scores.append(kpis.get("risk_adjusted_margin", -1e9))
    return int(np.argmax(scores)) if scores else -1
