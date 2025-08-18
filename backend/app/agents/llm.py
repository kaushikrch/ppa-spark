import os, json, time
from typing import List, Dict, Any
from openai import OpenAI

MODEL_DEFAULT = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def chat_json(messages: List[Dict[str, str]], temperature=0.4, top_p=0.9, model: str = MODEL_DEFAULT) -> Dict[str, Any]:
    """
    Robust JSON response:
    - 2 retries with backoff
    - 45s timeout
    - returns {"__error__": "..."} instead of {}
    """
    last_err = None
    for attempt in range(2):
        try:
            resp = client.chat.completions.create(
                model=model,
                temperature=temperature,
                top_p=top_p,
                response_format={"type": "json_object"},
                messages=messages,
                timeout=45
            )
            content = resp.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as e:
            last_err = str(e)
            time.sleep(1.5 ** attempt)
    return {"__error__": last_err or "llm_call_failed"}