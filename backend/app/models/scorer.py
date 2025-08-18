from typing import Dict, List, Tuple, Any
import pandas as pd
import numpy as np
from ..utils.io import engine
from ..models.simulator import simulate_price_change, simulate_delist

def _latest_price_and_base():
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

def pick_best(plans: List[Dict[str, Any]]) -> int:
    scores = []
    for p in plans:
        kpis, _ = evaluate_plan(p)
        scores.append(kpis.get("risk_adjusted_margin", -1e9))
    return int(np.argmax(scores)) if scores else -1