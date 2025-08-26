import pandas as pd
import numpy as np
from functools import lru_cache
from ..utils.io import engine
from ..bootstrap import bootstrap_if_needed

@lru_cache()
def _load():
    """Load core model tables once and cache for subsequent simulations."""
    bootstrap_if_needed()
    con = engine().connect()
    return (
        pd.read_sql("select * from price_weekly", con),
        pd.read_sql("select * from demand_weekly", con),
        pd.read_sql("select * from costs", con),
        pd.read_sql("select * from elasticities", con),
        pd.read_sql("select * from sku_master", con),
    )

# Simple what-if using elasticities; cross effects currently neutral (cross_factor = 1.0)

def simulate_price_change(sku_pct_changes: dict, weeks=None, retailer_ids=None):
    price, demand, costs, elast, sku = _load()
    df = demand.merge(price, on=["week","retailer_id","sku_id"])\
               .merge(costs, on="sku_id")\
               .merge(elast, on="sku_id", how="left")\
               .merge(sku[["sku_id","brand"]], on="sku_id")

    if weeks:
        df = df[df.week.isin(weeks)]
    if retailer_ids:
        df = df[df.retailer_id.isin(retailer_ids)]

    df["pct_change"] = df["sku_id"].map(lambda k: sku_pct_changes.get(str(k), sku_pct_changes.get(int(k), 0.0)))
    df["new_price"] = df["net_price"] * (1.0 + df["pct_change"])
    df["own_elast"].fillna(-1.0, inplace=True)

    # own effect
    own_factor = np.exp(df["own_elast"] * np.log(np.maximum(df["new_price"], 0.01) / np.maximum(df["net_price"], 0.01)))

    # cross effect: distribute by brand similarity
    cross_factor = 1.0  # cross effects are neutral
    # TODO: incorporate brand-level cross effects when similarity weights are defined
    # (For demo simplicity, we keep cross factor neutral; handled in optimizer)

    df["new_units"] = (df["units"] * own_factor).astype(int)
    df["new_revenue"] = df["new_units"] * df["new_price"]
    df["margin"] = (df["new_price"] - (df["cogs_per_unit"] + df["logistics_per_unit"])) * df["new_units"]

    agg = df.groupby(["week"]).agg(units=("new_units","sum"), revenue=("new_revenue","sum"), margin=("margin","sum")).reset_index()
    return agg, df

# Delist: reallocate some volume to nearest substitutes by brand+pack similarity

def simulate_delist(delist_skus: list, weeks=None):
    price, demand, costs, elast, sku = _load()
    df = demand.merge(price, on=["week","retailer_id","sku_id"]).merge(sku, on="sku_id")
    if weeks:
        df = df[df.week.isin(weeks)]
    base = df.copy()

    base["keep"] = ~base.sku_id.isin(delist_skus)
    keep = base[base.keep]
    lost = base[~base.keep]

    if lost.empty:
        return keep

    # similarity: same brand (0.6), same pack_size (0.3), same flavor (0.1)
    def similarity(a,b):
        return 0.6*(a.brand==b.brand) + 0.3*(a.pack_size_ml==b.pack_size_ml) + 0.1*(a.flavor==b.flavor)

    # Reallocate lost volume proportionally to top-3 similar items in the same retailer/week
    realloc = []
    for (w,r), g in lost.groupby(["week","retailer_id"]):
        keep_g = keep[(keep.week==w)&(keep.retailer_id==r)]
        if keep_g.empty: continue
        for _, row in g.iterrows():
            keep_g = keep_g.copy()
            keep_g["sim"] = keep_g.apply(lambda x: similarity(row,x), axis=1)
            top3 = keep_g.sort_values("sim", ascending=False).head(3)
            for _, t in top3.iterrows():
                realloc.append({"week": w, "retailer_id": r, "sku_id": t.sku_id, "add_units": int(row.units * (t.sim/top3.sim.sum()))})

    add = pd.DataFrame(realloc)
    if not add.empty:
        keep = keep.merge(add.groupby(["week","retailer_id","sku_id"]).add_units.sum().reset_index(), how="left")
        keep["units"] = keep["units"] + keep["add_units"].fillna(0).astype(int)
        keep.drop(columns=["add_units"], inplace=True)
    return keep
