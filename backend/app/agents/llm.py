import os, json
from typing import List, Dict, Any

import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

from ..utils.secrets import get_gemini_api_key


_MODEL_CACHE: Dict[str, GenerativeModel] = {}


def _get_model(name: str, key: str) -> GenerativeModel:
    """Initialize Vertex AI once and cache models for reuse."""
    if name not in _MODEL_CACHE:
        project = (
            os.getenv("PROJECT_ID")
            or os.getenv("GCP_PROJECT")
            or os.getenv("GOOGLE_CLOUD_PROJECT")
            or "dummy-project"
        )
        region = os.getenv("GCP_REGION") or os.getenv("REGION") or "us-central1"
        vertexai.init(project=project, location=region, api_key=key)
        _MODEL_CACHE[name] = GenerativeModel(name)
    return _MODEL_CACHE[name]


def _gemini_chat_json(messages, temperature, top_p, model=None):
    """Call Vertex AI Gemini and return parsed JSON."""
    key = get_gemini_api_key()
    if not key:
        raise RuntimeError("gemini_key_missing")

    model_name = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    mdl = _get_model(model_name, key)

    sys = "\n".join(m["content"] for m in messages if m["role"] == "system")
    usr = "\n".join(m["content"] for m in messages if m["role"] == "user")
    prompt = f"{sys}\n\n{usr}\n\nReturn ONLY valid JSON."

    cfg = GenerationConfig(
        temperature=temperature,
        top_p=top_p,
        response_mime_type="application/json",
    )
    r = mdl.generate_content(prompt, generation_config=cfg)
    text = (r.text or "{}").strip()
    start = text.find("{")
    if start != -1:
        depth = 0
        end = None
        for i, ch in enumerate(text[start:], start=start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end:
            text = text[start:end]
    return json.loads(text)


def chat_json(
    messages: List[Dict[str, str]],
    temperature: float = 0.4,
    top_p: float = 0.9,
    model: str | None = None,
) -> Dict[str, Any]:
    """Chat with Gemini and parse JSON; never uses OpenAI."""
    try:
        return _gemini_chat_json(messages, temperature, top_p, model)
    except Exception as e:
        return {"__error__": f"gemini:{e}"}

