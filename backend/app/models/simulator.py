import json
from functools import lru_cache

import numpy as np
import pandas as pd
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
    df["cross_elast"] = df["cross_elast_json"].fillna("{}").map(json.loads)
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
    df["pct_change"] = df["pct_change"].fillna(0.0).astype(float)
    df["new_price"] = df["net_price"] * (1.0 + df["pct_change"])

    # own effect driven purely by elasticities.  Use a simple elasticity * % price
    # change formulation so a 10% price increase with elasticity -1.24 results in
    # at least a 12.4% volume decline (instead of the milder change from the
    # log-log formulation).
    pct_price_change = df["pct_change"].fillna(0.0)
    pct_volume_change = df["own_elast"] * pct_price_change
    own_factor = 1.0 + pct_volume_change
    # Volumes should not go negative; clamp at zero.
    own_factor = pd.Series(np.clip(own_factor, a_min=0.0, a_max=None), index=df.index)

    # Cross effect: react to brand-level price changes captured in the elasticity model.
    weights = df["units"].fillna(0.0)
    values = df["pct_change"]
    weighted_change = (values * weights).groupby(df["brand"]).sum()
    weight_sum = weights.groupby(df["brand"]).sum()
    brand_means = values.groupby(df["brand"]).mean()
    brand_pct_change_series = weighted_change.divide(weight_sum.where(weight_sum > 0), fill_value=0.0)
    brand_pct_change_series = brand_pct_change_series.where(weight_sum > 0, brand_means).fillna(0.0)
    brand_pct_change = {
        brand: pct
        for brand, pct in brand_pct_change_series.items()
        if not np.isnan(pct)
    }
    active_brand_changes = {
        brand: pct for brand, pct in brand_pct_change.items() if abs(pct) > 1e-12
    }

    if active_brand_changes:
        cross_lookup = (
            df[["sku_id", "brand", "cross_elast"]]
            .drop_duplicates(subset=["sku_id"])
            .set_index("sku_id")
        )
        impact_cache: dict[tuple[str, tuple[tuple[str, float], ...]], float] = {}

        def _cross_impact(brand: str, cross_dict: dict[str, float]) -> float:
            if not cross_dict:
                return 0.0
            key = (brand, tuple(sorted(cross_dict.items())))
            cached = impact_cache.get(key)
            if cached is not None:
                return cached
            impact = 0.0
            for other_brand, elasticity in cross_dict.items():
                if other_brand == brand:
                    continue
                pct = active_brand_changes.get(other_brand)
                if pct is None or np.isnan(pct):
                    continue
                impact += elasticity * pct
            impact_cache[key] = impact
            return impact

        cross_lookup["cross_impact"] = [
            _cross_impact(brand, cross_dict)
            for brand, cross_dict in zip(cross_lookup["brand"], cross_lookup["cross_elast"])
        ]
        cross_impacts = df["sku_id"].map(cross_lookup["cross_impact"]).fillna(0.0)
    else:
        cross_impacts = pd.Series(0.0, index=df.index)

    cross_factor = (1.0 + cross_impacts).clip(lower=0.0)

    df["new_units"] = df["units"] * own_factor * cross_factor
    df["new_revenue"] = df["new_units"] * df["new_price"]
    df["margin"] = (df["new_price"] - df["cost_per_unit"]) * df["new_units"]
    df["base_revenue"] = df["net_price"] * df["units"]
    df["base_margin"] = (df["net_price"] - df["cost_per_unit"]) * df["units"]

    agg = (
        df.groupby(["week"])
        .agg(
            units=("new_units", "sum"),
            revenue=("new_revenue", "sum"),
            margin=("margin", "sum"),
            base_units=("units", "sum"),
            base_revenue=("base_revenue", "sum"),
            base_margin=("base_margin", "sum"),
        )
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
    lost_pairs = (
        lost[["week", "retailer_id", "sku_id", "units", "brand", "pack_size_ml", "flavor"]]
        .rename(columns={
            "sku_id": "sku_id_lost",
            "units": "lost_units",
            "brand": "brand_lost",
            "pack_size_ml": "pack_size_ml_lost",
            "flavor": "flavor_lost",
        })
        .copy()
    )
    keep_pairs = (
        keep[
            [
                "week",
                "retailer_id",
                "sku_id",
                "units",
                "brand",
                "pack_size_ml",
                "flavor",
            ]
        ]
        .rename(columns={
            "sku_id": "sku_id_keep",
            "units": "keep_units",
            "brand": "brand_keep",
            "pack_size_ml": "pack_size_ml_keep",
            "flavor": "flavor_keep",
        })
        .copy()
    )
    pairs = lost_pairs.merge(
        keep_pairs,
        on=["week", "retailer_id"],
    )
    # similarity: same brand (0.6), same pack_size (0.3), same flavor (0.1)
    pairs["sim"] = (
        0.6 * (pairs.brand_lost == pairs.brand_keep).astype(float)
        + 0.3 * (pairs.pack_size_ml_lost == pairs.pack_size_ml_keep).astype(float)
        + 0.1 * (pairs.flavor_lost == pairs.flavor_keep).astype(float)
    )
    # take top-3 similar keep SKUs for each lost SKU
    pairs = pairs.sort_values(
        ["week", "retailer_id", "sku_id_lost", "sim"],
        ascending=[True, True, True, False],
    )
    pairs = pairs.groupby(["week", "retailer_id", "sku_id_lost"]).head(3)
    # allocate lost volume proportionally to similarity
    pairs["sim_weight"] = pairs["sim"].clip(lower=0)
    pairs["volume_weight"] = pairs["keep_units"].clip(lower=0).fillna(0)
    pairs["weight"] = pairs["sim_weight"] * pairs["volume_weight"]
    group_keys = ["week", "retailer_id", "sku_id_lost"]
    weight_sum = pairs.groupby(group_keys)["weight"].transform("sum")
    fallback = weight_sum <= 0
    if fallback.any():
        sim_sum = pairs.groupby(group_keys)["sim_weight"].transform("sum")
        pairs.loc[fallback, "weight"] = pairs.loc[fallback, "sim_weight"]
        weight_sum = weight_sum.mask(fallback, sim_sum)
    pairs["weight"] = pairs["weight"].fillna(0)
    weight_sum = weight_sum.replace(0, np.nan)
    pairs["alloc"] = (
        pairs["lost_units"].fillna(0) * pairs["weight"] / weight_sum
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
