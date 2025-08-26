import os
import sys
import types
from fastapi.testclient import TestClient

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.main import app

client = TestClient(app)


def test_genai_insight(monkeypatch):
    class DummyResp:
        text = "test insight"

    class DummyModel:
        def __init__(self, *args, **kwargs):
            pass

        def generate_content(self, prompt, generation_config=None):
            return DummyResp()

    class DummyGenConfig:
        def __init__(self, **kwargs):
            pass

    dummy_module = types.SimpleNamespace(
        GenerativeModel=DummyModel,
        GenerationConfig=DummyGenConfig,
    )

    monkeypatch.setitem(sys.modules, "vertexai.generative_models", dummy_module)
    monkeypatch.setattr("app.main.get_gemini_api_key", lambda: "fake-key")
    monkeypatch.setattr("app.main.init_vertexai", lambda key: None)

    payload = {"panel_id": "p1", "q": "Explain", "data": [{"x": 1}]}
    resp = client.post("/genai/insight", json=payload)
    assert resp.status_code == 200
    assert resp.json()["insight"] == "test insight"
