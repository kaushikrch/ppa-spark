import pandas as pd
import numpy as np
from functools import lru_cache
from ..utils.io import engine
from ..bootstrap import bootstrap_if_needed

# Limit how much historical data we pull into memory so simulations finish quickly.
# A large dataset was causing price and delist simulations to take a long time.
RECENT_WEEKS = 12

@lru_cache()
def _load():
    """Load a recent slice of core model tables and cache for reuse."""
    bootstrap_if_needed()
    con = engine().connect()
    # fetch only the most recent weeks to keep dataframe sizes small
    max_week = pd.read_sql("select max(week) as w from price_weekly", con).iloc[0]["w"]
    wk_cutoff = max_week - RECENT_WEEKS + 1
    where = f" where week >= {int(wk_cutoff)}"
    return (
        pd.read_sql(f"select * from price_weekly{where}", con),
        pd.read_sql(f"select * from demand_weekly{where}", con),
        pd.read_sql("select * from costs", con),
        pd.read_sql("select * from elasticities", con),
        pd.read_sql("select * from sku_master", con),
    )


@lru_cache()
def _price_simulation_frame() -> pd.DataFrame:
    """Pre-merge the data required for price simulations.

    The merge is fairly expensive, so we do it once and cache the resulting
    dataframe.  Callers should take a copy before mutating.
    """

    price, demand, costs, elast, sku = _load()
    df = (
        demand.merge(price, on=["week", "retailer_id", "sku_id"], how="inner")
        .merge(costs, on="sku_id", how="left")
        .merge(elast, on="sku_id", how="left")
        .merge(sku[["sku_id", "brand"]], on="sku_id", how="left")
    )
    df["own_elast"] = df["own_elast"].fillna(-1.0)
    # Some synthetic elasticities can be exactly zero when the regression
    # fallback fails.  Treat near-zero values as missing so simulations still
    # react to price changes instead of showing 0% impact across the UI.
    df.loc[df["own_elast"].abs() < 1e-4, "own_elast"] = -1.0
    df["cost_per_unit"] = df["cogs_per_unit"].fillna(0.0) + df["logistics_per_unit"].fillna(0.0)
    return df


@lru_cache()
def _delist_frame() -> pd.DataFrame:
    """Pre-merge demand, price and SKU attributes for delist simulations."""

    price, demand, _costs, _elast, sku = _load()
    return demand.merge(price, on=["week", "retailer_id", "sku_id"], how="inner").merge(
        sku, on="sku_id", how="left"
    )

# Simple what-if using elasticities; cross effects currently neutral (cross_factor = 1.0)

def simulate_price_change(sku_pct_changes: dict, weeks=None, retailer_ids=None):
    df = _price_simulation_frame().copy()

    if weeks:
        df = df[df.week.isin(weeks)]
    if retailer_ids:
        df = df[df.retailer_id.isin(retailer_ids)]

    df["pct_change"] = df["sku_id"].map(
        lambda k: sku_pct_changes.get(str(k), sku_pct_changes.get(int(k), 0.0))
    )
    df["pct_change"] = df["pct_change"].fillna(0.0)
    df["new_price"] = df["net_price"] * (1.0 + df["pct_change"])

    # own effect driven purely by elasticities
    price_ratio = np.maximum(df["new_price"], 0.01) / np.maximum(df["net_price"], 0.01)
    own_factor = np.exp(df["own_elast"] * np.log(price_ratio))

    # cross effect: distribute by brand similarity
    cross_factor = 1.0  # cross effects are neutral
    # TODO: incorporate brand-level cross effects when similarity weights are defined
    # (For demo simplicity, we keep cross factor neutral; handled in optimizer)

    df["new_units"] = df["units"] * own_factor * cross_factor
    df["new_revenue"] = df["new_units"] * df["new_price"]
    df["margin"] = (df["new_price"] - df["cost_per_unit"]) * df["new_units"]

    agg = (
        df.groupby(["week"])
        .agg(units=("new_units", "sum"), revenue=("new_revenue", "sum"), margin=("margin", "sum"))
        .reset_index()
    )
    return agg, df

# Delist: reallocate some volume to nearest substitutes by brand+pack similarity

def simulate_delist(delist_skus: list, weeks=None):
    df = _delist_frame().copy()
    if weeks:
        df = df[df.week.isin(weeks)]
    base = df.copy()

    base["keep"] = ~base.sku_id.isin(delist_skus)
    keep = base[base.keep].copy()
    lost = base[~base.keep]

    if lost.empty:
        keep["new_units"] = keep["units"]
        keep["volume_gain"] = 0
        return keep

    # Build pairwise similarity between lost and kept SKUs within the same week/retailer
    lost_pairs = lost[
        ["week", "retailer_id", "sku_id", "units", "brand", "pack_size_ml", "flavor"]
    ]
    keep_pairs = keep[["week", "retailer_id", "sku_id", "brand", "pack_size_ml", "flavor"]]
    pairs = lost_pairs.merge(
        keep_pairs,
        on=["week", "retailer_id"],
        suffixes=("_lost", "_keep"),
    )
    # similarity: same brand (0.6), same pack_size (0.3), same flavor (0.1)
    pairs["sim"] = (
        0.6 * (pairs.brand_lost == pairs.brand_keep).astype(float)
        + 0.3 * (pairs.pack_size_ml_lost == pairs.pack_size_ml_keep).astype(float)
        + 0.1 * (pairs.flavor_lost == pairs.flavor_keep).astype(float)
    )
    # take top-3 similar keep SKUs for each lost SKU
    pairs = pairs.sort_values(["week", "retailer_id", "sku_id_lost", "sim"], ascending=[True, True, True, False])
    pairs = pairs.groupby(["week", "retailer_id", "sku_id_lost"]).head(3)
    # allocate lost volume proportionally to similarity
    pairs["alloc"] = (
        pairs.units
        * pairs.sim
        / pairs.groupby(["week", "retailer_id", "sku_id_lost"]).sim.transform("sum")
    ).fillna(0)

    add = (
        pairs.groupby(["week", "retailer_id", "sku_id_keep"])
        .alloc.sum()
        .reset_index()
        .rename(columns={"sku_id_keep": "sku_id", "alloc": "add_units"})
    )
    if not add.empty:
        keep = keep.merge(add, on=["week", "retailer_id", "sku_id"], how="left")
        keep["add_units"] = keep["add_units"].fillna(0)
        keep["new_units"] = keep["units"] + keep["add_units"]
        keep["volume_gain"] = keep["add_units"]
        keep.drop(columns=["add_units"], inplace=True)
    else:
        keep["new_units"] = keep["units"]
        keep["volume_gain"] = 0
    return keep
