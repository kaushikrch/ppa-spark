import os
import sys
from fastapi.testclient import TestClient

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.main import app

client = TestClient(app)


def test_huddle_round_cap(monkeypatch):
    def fake_huddle(q, budget, debate_rounds):
        return {"stopped_after_rounds": debate_rounds}

    monkeypatch.setattr("app.main.agentic_huddle_v2", fake_huddle)
    payload = {"q": "Improve margins", "budget": 1000, "rounds": 5}
    resp = client.post("/huddle/run", json=payload)
    assert resp.status_code == 200
    assert resp.json()["stopped_after_rounds"] == 3
