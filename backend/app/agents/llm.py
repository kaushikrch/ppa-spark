import os, json
from typing import List, Dict, Any

from ..utils.secrets import get_gemini_api_key


def _gemini_chat_json(messages, temperature, top_p, model=None):
    """Call Vertex AI Gemini and return parsed JSON."""
    key = get_gemini_api_key()
    if not key:
        raise RuntimeError("gemini_key_missing")
    import google.generativeai as genai
    genai.configure(api_key=key)

    sys = "\n".join(m["content"] for m in messages if m["role"] == "system")
    usr = "\n".join(m["content"] for m in messages if m["role"] == "user")
    prompt = f"{sys}\n\n{usr}\n\nReturn ONLY valid JSON."
    model_name = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    r = genai.GenerativeModel(model_name).generate_content(
        prompt, request_options={"timeout": 600}
    )
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

