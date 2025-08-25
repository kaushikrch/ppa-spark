import os
import sys
from fastapi.testclient import TestClient

# Ensure the app package is importable
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.main import app

client = TestClient(app)


def test_generate_returns_immediately(monkeypatch):
    # Avoid running the heavy generation logic during tests
    monkeypatch.setattr("app.main.gen_weekly_data", lambda: None)
    resp = client.post("/data/generate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "started" in data["message"].lower()


def test_train_returns_immediately(monkeypatch):
    # Avoid running the heavy training logic during tests
    monkeypatch.setattr("app.main.fit_elasticities", lambda: None)
    resp = client.post("/models/train")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "started" in data["message"].lower()
