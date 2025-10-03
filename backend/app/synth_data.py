import os
import time
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from .utils.io import write_table, to_parquet


BRANDS = ["Aurel", "Novis", "Verra", "Kairo", "Lumio"]
FLAVORS = ["Cola", "Orange", "Lime", "Berry", "Ginger"]
PACKS = [(250, "Can"), (330, "Can"), (500, "PET"), (1000, "PET"), (1500, "PET")]
REGIONS = ["North", "South", "East", "West"]
CHANNELS = ["ModernTrade", "GeneralTrade", "eCom"]

rng = np.random.default_rng(42)


def make_sku_master(n_per_brand: int = 12) -> pd.DataFrame:
    rows = []
    sku_id = 1000
    for b in BRANDS:
        for i in range(n_per_brand):
            pack_size, pack_type = PACKS[i % len(PACKS)]
            flavor = FLAVORS[i % len(FLAVORS)]
            tier = rng.choice(["Value", "Core", "Premium"], p=[0.2, 0.6, 0.2])
            sugar_free = int(rng.random() < 0.25)
            rows.append(
                {
                    "sku_id": sku_id,
                    "brand": b,
                    "subcat": "CSD",
                    "pack_size_ml": pack_size,
                    "pack_type": pack_type,
                    "tier": tier,
                    "sugar_free": sugar_free,
                    "flavor": flavor,
                    "launch_week": int(rng.integers(1, 26)),
                }
            )
            sku_id += 1
    return pd.DataFrame(rows)


def base_price(pack_ml, tier):
    ppm = 0.0022 if tier == "Value" else 0.0028 if tier == "Core" else 0.0035
    return round(pack_ml * ppm, 2)


def gen_weekly_data(
    weeks: int | None = None,
    n_per_brand: int | None = None,
    retailers_per_combo: int | None = None,
    max_minutes: int | None = None,
) -> bool:
    """Generate synthetic weekly pricing and demand data.

    Defaults are intentionally small so generation completes quickly for demos.
    Values can be overridden with environment variables:
      SYNTH_WEEKS, SYNTH_SKUS_PER_BRAND, SYNTH_RETAILERS_PER_COMBO, SYNTH_MAX_MINUTES.
    """

    weeks = weeks or int(os.getenv("SYNTH_WEEKS", "26"))
    n_per_brand = n_per_brand or int(os.getenv("SYNTH_SKUS_PER_BRAND", "4"))
    retailers_per_combo = retailers_per_combo or int(
        os.getenv("SYNTH_RETAILERS_PER_COMBO", "1")
    )
    max_minutes = max_minutes or int(os.getenv("SYNTH_MAX_MINUTES", "5"))
    start_time = time.time()

    sku = make_sku_master(n_per_brand=n_per_brand)
    retailers = []
    rid = 1
    for r in REGIONS:
        for c in CHANNELS:
            for k in range(retailers_per_combo):
                retailers.append(
                    {
                        "retailer_id": rid,
                        "name": f"{c[:2]}_{r}_{k+1}",
                        "region": r,
                        "channel": c,
                        "store_cluster": rng.choice(["S", "M", "L"], p=[0.3, 0.5, 0.2]),
                    }
                )
                rid += 1
    retailer = pd.DataFrame(retailers)

    start = datetime.today() - timedelta(weeks=weeks)
    week_index = [int(i + 1) for i in range(weeks)]

    price_rows, demand_rows, comp_rows, cost_rows = [], [], [], []

    # brand elasticities (latent truth)
    brand_own = {b: -1.2 + 0.6 * rng.random() for b in BRANDS}
    cross_matrix = {
        b: {bb: (-0.2 if b == bb else 0.15 * rng.random()) for bb in BRANDS}
        for b in BRANDS
    }

    for _, s in sku.iterrows():
        cogs = round(0.45 * base_price(s.pack_size_ml, s.tier), 2)
        logi = round(0.05 * base_price(s.pack_size_ml, s.tier), 2)
        cost_rows.append(
            {"sku_id": s.sku_id, "cogs_per_unit": cogs, "logistics_per_unit": logi}
        )

    for w in week_index:
        if time.time() - start_time > max_minutes * 60:
            print("Reached maximum generation time; stopping early.")
            break
        season = 1.0 + 0.12 * np.sin(2 * np.pi * w / 52)
        for _, rt in retailer.iterrows():
            if time.time() - start_time > max_minutes * 60:
                break
            # competitor brand signals per retailer
            for b in BRANDS:
                if time.time() - start_time > max_minutes * 60:
                    break
                base = 1.0 + 0.05 * rng.standard_normal()
                comp_price = round(1.0 * base + 0.1 * rng.random(), 2)
                promo_int = max(0.0, min(0.5, 0.2 + 0.15 * rng.standard_normal()))
                comp_rows.append(
                    {
                        "week": w,
                        "retailer_id": rt.retailer_id,
                        "brand": b,
                        "avg_price": comp_price,
                        "promo_intensity": promo_int,
                    }
                )

            for _, s in sku.iterrows():
                if time.time() - start_time > max_minutes * 60:
                    break
                lp = base_price(s.pack_size_ml, s.tier)
                promo_flag = int(rng.random() < 0.18)
                promo_depth = (
                    round(0.05 + 0.15 * rng.random(), 2) if promo_flag else 0.0
                )
                netp = round(
                    lp * (1 - promo_depth) * (0.95 + 0.1 * rng.random()), 2
                )
                disc_spend = round(
                    lp * promo_depth * rng.uniform(200, 1200) / 1000, 2
                )

                # latent demand drivers
                brand_beta = brand_own[s.brand]
                flavor_boost = 1.0 + (0.06 if s.flavor in ["Berry", "Ginger"] else 0.0)
                sugar_penalty = 0.92 if s.sugar_free == 1 else 1.0
                cluster = {"S": 0.85, "M": 1.0, "L": 1.15}[rt.store_cluster]

                # competitor effect via brand signals
                comp_subset = [
                    c
                    for c in comp_rows
                    if c["week"] == w and c["retailer_id"] == rt.retailer_id
                ]
                comp_df = pd.DataFrame(comp_subset)
                cross_effect = 0.0
                for b2 in BRANDS:
                    cross_b = cross_matrix[s.brand][b2]
                    refp = comp_df.loc[comp_df.brand == b2, "avg_price"].values[0]
                    cross_effect += cross_b * np.log(max(refp, 0.01))

                # demand model (log-linear)
                mean_units = (
                    np.exp(
                        3.0
                        + brand_beta * np.log(max(netp, 0.01))
                        + 0.25 * promo_flag
                        + 0.05 * s.pack_size_ml / 1000
                        + cross_effect
                    )
                    * season
                    * flavor_boost
                    * sugar_penalty
                    * cluster
                )
                noise = rng.lognormal(mean=0.0, sigma=0.25)
                units = max(0, int(mean_units * noise / 30))
                revenue = round(units * netp, 2)

                price_rows.append(
                    {
                        "week": w,
                        "retailer_id": rt.retailer_id,
                        "sku_id": s.sku_id,
                        "list_price": lp,
                        "net_price": netp,
                        "promo_flag": promo_flag,
                        "promo_depth": promo_depth,
                        "discount_spend": disc_spend,
                    }
                )
                demand_rows.append(
                    {
                        "week": w,
                        "retailer_id": rt.retailer_id,
                        "sku_id": s.sku_id,
                        "units": units,
                        "revenue": revenue,
                        "base_units": int(units * (1 - 0.25 * promo_flag)),
                        "uplift_units": int(
                            units - int(units * (1 - 0.25 * promo_flag))
                        ),
                    }
                )

    sku_master = make_sku_master(n_per_brand=n_per_brand)
    retailer = pd.DataFrame(retailers)
    price_weekly = pd.DataFrame(price_rows)
    demand_weekly = pd.DataFrame(demand_rows)
    competitor_weekly = pd.DataFrame(comp_rows)
    costs = pd.DataFrame(cost_rows)

    # guardrails
    g = price_weekly.groupby("sku_id").net_price.mean().reset_index()
    g["min_price"] = (g.net_price * 0.85).round(2)
    g["max_price"] = (g.net_price * 1.15).round(2)
    g["max_pct_change"] = 0.1
    g["min_shelf_share"] = 0.01
    g["must_stock_flag"] = 0
    guardrails = g.drop(columns=["net_price"])

    # persist
    for name, df in {
        "sku_master": sku_master,
        "retailer": retailer,
        "price_weekly": price_weekly,
        "demand_weekly": demand_weekly,
        "competitor_weekly": competitor_weekly,
        "costs": costs,
        "guardrails": guardrails,
    }.items():
        write_table(df, name)
        to_parquet(df, name)

    # Refresh memoized tables used by simulators/optimizer so downstream API
    # calls immediately reflect the newly generated dataset.
    from .models.cache import invalidate_model_caches

    invalidate_model_caches()

    return True


if __name__ == "__main__":
    gen_weekly_data()

