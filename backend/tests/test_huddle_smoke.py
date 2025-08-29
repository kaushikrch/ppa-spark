import os
import sys
import pandas as pd
from unittest.mock import patch
from fastapi.testclient import TestClient

# Ensure the app package is importable
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.main import app

client = TestClient(app)


def test_huddle_smoke():
    payload = {"q": "How can we improve margins?", "budget": 1000}

    # Minimal optimizer tables for a single SKU
    tiny_tables = (
        pd.DataFrame({"sku_id": [1], "week": [1], "net_price": [10.0]}),
        pd.DataFrame({"sku_id": [1], "week": [1], "units": [100.0]}),
        pd.DataFrame({"sku_id": [1], "cogs_per_unit": [6.0], "logistics_per_unit": [1.0]}),
        pd.DataFrame({"sku_id": [1], "floor": [8.0], "ceiling": [12.0]}),
        pd.DataFrame({"sku_id": [1], "own_elast": [-1.0]}),
    )

    def rag_fail(*args, **kwargs):
        raise Exception("offline")

    def fake_chat_json(*args, **kwargs):
        raise TimeoutError("llm timeout")

    dummy_agg = pd.DataFrame([{"units": 100, "revenue": 1000, "margin": 200}])

    def fake_sim_price(changes):
        return dummy_agg, pd.DataFrame([{"sku_id": 1}])

    def fake_sim_delist(ids):
        return pd.DataFrame()

    with (
        patch("app.agents.orchestrator.rag.query", rag_fail),
        patch("app.agents.orchestrator.chat_json", fake_chat_json),
        patch("app.models.optimizer._load_tables", return_value=tiny_tables),
        patch("app.models.scorer.simulate_price_change", fake_sim_price),
        patch("app.models.scorer.simulate_delist", fake_sim_delist),
        patch.dict(os.environ, {"OPTIMIZER_MAX_SKUS": "1", "OPTIMIZER_TIME_LIMIT": "5"}, clear=False),
    ):
        resp = client.post("/huddle/run", json=payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data["final"]["plan_name"] == "Optimizer-backed fallback"
    assert "LLM unavailable or timed out" in data["final"]["rationale"]
    assert "Some data sources were unavailable" in data.get("error", "")

