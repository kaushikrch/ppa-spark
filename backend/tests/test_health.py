import os
import sys
from fastapi.testclient import TestClient

# Ensure the app package is importable
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.main import app

client = TestClient(app)

def test_healthz_get():
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}

def test_healthz_head():
    resp = client.head("/healthz")
    assert resp.status_code == 200
