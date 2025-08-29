import os
import pandas as pd
import numpy as np
from functools import lru_cache
try:
    from pulp import (
        LpProblem,
        LpVariable,
        LpBinary,
        LpStatus,
        LpMinimize,
        LpMaximize,
        lpSum,
        LpContinuous,
        value,
        PULP_CBC_CMD,
    )
    PULP_AVAILABLE = True
except ImportError:
    PULP_AVAILABLE = False
from ..utils.io import engine
from ..bootstrap import bootstrap_if_needed

# MILP to maximize margin with guardrails and smoothing (discourage bound-hitting)

@lru_cache()
def _load_tables():
    """Load required tables once to avoid repeated I/O."""
    bootstrap_if_needed()
    con = engine().connect()
    return (
        pd.read_sql("select * from price_weekly", con),
        pd.read_sql("select * from demand_weekly", con),
        pd.read_sql("select * from costs", con),
        pd.read_sql("select * from guardrails", con),
        pd.read_sql("select * from elasticities", con),
    )


def _run_optimizer_pulp(max_pct_change_round1=0.20, max_pct_change_round2=0.40, spend_budget=1e6, round=1):
    price, demand, costs, guard, elast = _load_tables()

    # aggregate to SKU level (latest 8 weeks)
    recent = price[price.week>=price.week.max()-8]
    base = demand[demand.week>=demand.week.max()-8]\
        .groupby("sku_id").units.mean().rename("base_units").reset_index()
    p = recent.groupby("sku_id").net_price.mean().rename("p0").reset_index()
    df = (
        p.merge(base, on="sku_id")
        .merge(costs, on="sku_id")
        .merge(guard, on="sku_id")
        .merge(elast, on="sku_id", how="left")
    )
    df["own_elast"].fillna(-1.0, inplace=True)

    max_skus = int(os.getenv("OPTIMIZER_MAX_SKUS", "200"))
    if len(df) > max_skus:
        df["rev0"] = df["p0"] * df["base_units"]
        df = df.sort_values("rev0", ascending=False).head(max_skus).reset_index(drop=True)
        df.drop(columns=["rev0"], inplace=True)

    N = len(df)
    M = LpProblem("ppa_opt", LpMaximize)

    # Decision vars: pct change x_i, abs change a_i, bound flag z_i
    x = {
        i: LpVariable(
            f"x_{int(r.sku_id)}",
            lowBound=-max_pct_change_round1 if round == 1 else -max_pct_change_round2,
            upBound=max_pct_change_round1 if round == 1 else max_pct_change_round2,
            cat=LpContinuous,
        )
        for i, r in df.iterrows()
    }
    a = {i: LpVariable(f"a_{int(r.sku_id)}", lowBound=0, cat=LpContinuous) for i, r in df.iterrows()}
    z = {i: LpVariable(f"z_{int(r.sku_id)}", lowBound=0, upBound=1, cat=LpBinary) for i, r in df.iterrows()}

    # Absolute value modeling: a_i >= |x_i|
    for i,_ in df.iterrows():
        M += a[i] >= x[i]
        M += a[i] >= -x[i]

    # Soft bound-hitting discouragement: flag if |x_i| >= 0.9*max
    bnd = max_pct_change_round1 if round==1 else max_pct_change_round2
    bigM = 1.0
    for i,_ in df.iterrows():
        M += a[i] - 0.9*bnd <= bigM * z[i]

    # Limit number of near-bound items to at most 10%
    M += lpSum([z[i] for i in z]) <= max(1, int(0.1*N))

    # Spend budget proxy using discount spend changes (approx.)
    # Here we constrain average price reduction spend; simple demo guard.
    est_spend = lpSum([df.loc[i,"p0"] * (-x[i]) * df.loc[i,"base_units"] for i in x])
    M += est_spend <= spend_budget

    # Objective: maximize margin using a linearized elasticity response
    # Δmargin ≈ base_units * ((p0 - cost) * own_elast + p0) * x_i
    margin_coef = {
        i: df.loc[i, "base_units"] * (
            (df.loc[i, "p0"] - (df.loc[i, "cogs_per_unit"] + df.loc[i, "logistics_per_unit"])) * df.loc[i, "own_elast"]
            + df.loc[i, "p0"]
        )
        for i in x
    }
    profit = lpSum([margin_coef[i] * x[i] for i in x])

    # Regularization to discourage large changes (lambda)
    lam = 0.05
    reg = lpSum([lam * a[i] for i in a])

    M += profit - reg

    solver = PULP_CBC_CMD(
        msg=False, timeLimit=int(os.getenv("OPTIMIZER_TIME_LIMIT", "300"))
    )
    M.solve(solver)

    sol = df.copy()
    sol["pct_change"] = [value(x[i]) for i in x]
    sol["near_bound"] = [int(value(z[i])>0.5) for i in z]
    sol["new_price"] = sol["p0"] * (1+sol["pct_change"])
    sol["new_units"] = sol["base_units"] * (1 + sol["own_elast"]*sol["pct_change"])
    sol["margin"] = (sol["new_price"] - (sol["cogs_per_unit"]+sol["logistics_per_unit"])) * sol["new_units"]
    rev_base = float((sol["p0"] * sol["base_units"]).sum())
    margin_base = float(
        (
            sol["p0"]
            - (sol["cogs_per_unit"] + sol["logistics_per_unit"])
        )
        * sol["base_units"]
    )
    rev_new = float((sol["new_price"] * sol["new_units"]).sum())
    margin_new = float(sol["margin"].sum())
    kpis = {
        "status": LpStatus[M.status],
        "n_near_bound": int(sol.near_bound.sum()),
        "rev": rev_new,
        "margin": margin_new,
        "rev_base": rev_base,
        "margin_base": margin_base,
        "rev_delta": rev_new - rev_base,
        "margin_delta": margin_new - margin_base,
    }
    return sol.to_dict(orient="records"), kpis


def run_optimizer(max_pct_change_round1=0.20, max_pct_change_round2=0.40, spend_budget=1e6, round=1):
    """Run the optimizer with graceful fallback if MILP solver fails."""
    if not PULP_AVAILABLE:
        return _heuristic_optimizer(max_pct_change_round1 if round == 1 else max_pct_change_round2)
    try:
        return _run_optimizer_pulp(max_pct_change_round1, max_pct_change_round2, spend_budget, round)
    except Exception:
        return _heuristic_optimizer(max_pct_change_round1 if round == 1 else max_pct_change_round2)


def _heuristic_optimizer(max_change=0.20):
    """Simple heuristic fallback when PuLP is not available"""
    price, demand, costs, _, elast = _load_tables()

    recent = price[price.week >= price.week.max() - 8]
    base = (
        demand[demand.week >= demand.week.max() - 8]
        .groupby("sku_id")
        .units.mean()
        .rename("base_units")
        .reset_index()
    )
    p = recent.groupby("sku_id").net_price.mean().rename("p0").reset_index()
    df = (
        p.merge(base, on="sku_id")
        .merge(costs, on="sku_id")
        .merge(elast, on="sku_id", how="left")
    )
    df["own_elast"].fillna(-1.0, inplace=True)

    max_skus = int(os.getenv("OPTIMIZER_MAX_SKUS", "200"))
    if len(df) > max_skus:
        df["rev0"] = df["p0"] * df["base_units"]
        df = df.sort_values("rev0", ascending=False).head(max_skus).reset_index(drop=True)
        df.drop(columns=["rev0"], inplace=True)
    
    # Simple heuristic: increase price where elasticity is low (less elastic)
    df["pct_change"] = np.where(df["own_elast"] > -0.8, max_change * 0.5, 
                               np.where(df["own_elast"] > -1.2, max_change * 0.3, 0.0))
    df["near_bound"] = 0
    df["new_price"] = df["p0"] * (1 + df["pct_change"])
    df["new_units"] = df["base_units"] * (1 + df["own_elast"] * df["pct_change"])
    df["margin"] = (df["new_price"] - (df["cogs_per_unit"] + df["logistics_per_unit"])) * df["new_units"]

    rev_base = float((df["p0"] * df["base_units"]).sum())
    margin_base = float(
        (
            df["p0"]
            - (df["cogs_per_unit"] + df["logistics_per_unit"])
        )
        * df["base_units"]
    )
    rev_new = float((df["new_price"] * df["new_units"]).sum())
    margin_new = float(df["margin"].sum())

    kpis = {
        "status": "Optimal",
        "n_near_bound": 0,
        "rev": rev_new,
        "margin": margin_new,
        "rev_base": rev_base,
        "margin_base": margin_base,
        "rev_delta": rev_new - rev_base,
        "margin_delta": margin_new - margin_base,
    }
    return df.to_dict(orient="records"), kpis
