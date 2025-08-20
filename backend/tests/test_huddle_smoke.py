import os
import sys
from fastapi.testclient import TestClient

# Ensure the app package is importable
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.main import app

client = TestClient(app)

def test_huddle_smoke():
    payload = {"q": "How can we improve margins?", "budget": 1000}
    resp = client.post("/huddle/run", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "final" in data
    assert data["final"]["plan_name"] in {"Optimizer-backed fallback", "Optimizer fallback"}

