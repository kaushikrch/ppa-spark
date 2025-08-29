import os
import sys
import pandas as pd
from fastapi.testclient import TestClient

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.main import app

client = TestClient(app)


def test_simulate_price_smoke(monkeypatch):
    dummy_agg = pd.DataFrame([{"week": 1, "units": 10, "revenue": 100, "margin": 20}])
    dummy_rows = pd.DataFrame([{"sku_id": 1, "brand": "A"}])
    monkeypatch.setattr("app.main.simulate_price_change", lambda changes: (dummy_agg, dummy_rows))
    resp = client.post("/simulate/price", json={"1": 0.05})
    assert resp.status_code == 200
    data = resp.json()
    assert data["agg"][0]["week"] == 1
    assert data["rows"][0]["sku_id"] == 1


def test_optimize_run_smoke(monkeypatch):
    dummy_kpis = {
        "status": "Optimal",
        "n_near_bound": 0,
        "rev": 100,
        "margin": 10,
        "vol": 50,
        "rev_base": 90,
        "margin_base": 8,
        "vol_base": 45,
        "rev_delta": 10,
        "margin_delta": 2,
        "vol_delta": 5,
    }
    monkeypatch.setattr("app.main.run_optimizer", lambda round=1: ([{"sku_id": 1}], dummy_kpis))
    resp = client.post("/optimize/run")
    assert resp.status_code == 200
    data = resp.json()
    assert data["solution"][0]["sku_id"] == 1
    for key in dummy_kpis:
        assert key in data["kpis"]
