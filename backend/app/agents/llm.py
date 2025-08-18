import os, json, time
from typing import List, Dict, Any
from openai import OpenAI

MODEL_DEFAULT = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def chat_json(messages: List[Dict[str, str]], temperature=0.4, top_p=0.9, model: str = MODEL_DEFAULT) -> Dict[str, Any]:
    """
    OpenAI chat with JSON object output.
    Retries and times out cleanly to avoid UI 'Network Error'.
    """
    last_err = None
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=model,
                temperature=temperature,
                top_p=top_p,
                response_format={"type": "json_object"},
                messages=messages,
                timeout=45  # seconds
            )
            content = resp.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as e:
            last_err = str(e)
            time.sleep(1.5 ** attempt)
    # Always return valid JSON so the UI never chokes
    return {"error": "llm_call_failed", "detail": last_err or "unknown_error"}