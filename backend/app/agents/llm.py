import os
import json
from typing import List, Dict, Any
from openai import OpenAI

MODEL_DEFAULT = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def chat_json(messages: List[Dict[str, str]], temperature=0.4, top_p=0.9, model: str = MODEL_DEFAULT) -> Dict[str, Any]:
    """
    OpenAI chat with JSON object output.
    Returns parsed JSON dict; {} if anything fails.
    """
    try:
        resp = client.chat.completions.create(
            model=model,
            temperature=temperature,
            top_p=top_p,
            response_format={"type": "json_object"},
            messages=messages
        )
        content = resp.choices[0].message.content or "{}"
        return json.loads(content)
    except Exception:
        return {}