import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from ..utils.io import engine, write_table

# Fit own & cross elasticity using log-log regression

def fit_elasticities():
    con = engine().connect()
    price = pd.read_sql("select * from price_weekly", con)
    demand = pd.read_sql("select * from demand_weekly", con)
    comp = pd.read_sql("select * from competitor_weekly", con)
    sku = pd.read_sql("select * from sku_master", con)
    brands = sorted(comp["brand"].unique())

    df = demand.merge(price, on=["week","retailer_id","sku_id"]).merge(sku, on="sku_id")
    # competitor brand avg price feature per row
    comp_avg = comp.pivot_table(index=["week","retailer_id"], columns="brand", values="avg_price").reset_index()
    df = df.merge(comp_avg, on=["week","retailer_id"], how="left")

    elast_rows = []
    imp_rows = []

    for sku_id, sdf in df.groupby("sku_id"):
        if len(sdf) < 30:
            continue
        X = sdf[["net_price", "promo_flag"]].copy()
        for b in brands:
            if b in sdf.columns:
                X[b] = np.log(np.maximum(sdf[b], 0.01))
            else:
                X[b] = 0.0

        # Own-price elasticity from slope on log(price)
        X_lp = np.column_stack(
            [np.log(np.maximum(sdf["net_price"].values, 0.01))]
            + [X[b].values for b in brands]
        )
        reg = LinearRegression().fit(X_lp, np.log(np.maximum(sdf["units"].values, 1)))
        own_elast = float(reg.coef_[0])  # slope wrt log(price)
        cross = {b: float(c) for b, c in zip(brands, reg.coef_[1:])}
        elast_rows.append({"sku_id": sku_id, "own_elast": own_elast, "cross_elast_json": pd.Series(cross).to_json(), "stat_sig": 1})

        # Attribute importance using RF
        num_cols = ["net_price","promo_flag","pack_size_ml"]
        cat_cols = ["brand","tier","pack_type","flavor"]
        feats = sdf[num_cols + cat_cols].copy()
        oh = ColumnTransformer([
            ("num","passthrough", num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols)
        ])
        pipe = Pipeline([("prep", oh), ("rf", RandomForestRegressor(n_estimators=120, random_state=42))])
        pipe.fit(feats, sdf["units"])    
        importances = pipe.named_steps["rf"].feature_importances_
        names = (list(num_cols) + list(pipe.named_steps["prep"].named_transformers_["cat"].get_feature_names_out(cat_cols)))
        top = pd.Series(importances, index=names).sort_values(ascending=False).head(15)
        imp_rows.append({"sku_id": sku_id, "importance_json": top.to_json()})

    write_table(pd.DataFrame(elast_rows), "elasticities")
    write_table(pd.DataFrame(imp_rows), "attributes_importance")
    return True
