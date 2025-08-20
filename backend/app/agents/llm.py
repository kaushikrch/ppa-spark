import os, json, time
from typing import List, Dict, Any

import httpx

from ..utils.secrets import get_gemini_api_key, get_openai_api_key

# Lazily constructed OpenAI client so secret lookup/network I/O doesn't
# block module import or application startup.
_oai_client: "OpenAI | None" = None


def _get_openai_client():
    global _oai_client
    if _oai_client is None:
        key = get_openai_api_key()
        if not key:
            return None
        from openai import OpenAI
        # httpx>=0.28 removed the ``proxies`` kwarg used by the OpenAI client
        # when auto-detecting proxy settings. Construct a client ourselves so
        # the SDK doesn't try to pass the deprecated argument.
        _http_client = httpx.Client(follow_redirects=True, timeout=60, trust_env=False)
        _oai_client = OpenAI(api_key=key, http_client=_http_client)
    return _oai_client

def _openai_chat_json(messages, temperature, top_p, model):
    client = _get_openai_client()
    if not client:
        raise RuntimeError("openai_key_missing")
    resp = client.chat.completions.create(
        model=model or os.getenv("OPENAI_MODEL","gpt-4o"),
        temperature=temperature, top_p=top_p,
        response_format={"type": "json_object"},
        messages=messages, timeout=45
    )
    content = resp.choices[0].message.content or "{}"
    return json.loads(content)

def _gemini_chat_json(messages, temperature, top_p):
    key = get_gemini_api_key()
    if not key:
        raise RuntimeError("gemini_key_missing")
    import google.generativeai as genai
    genai.configure(api_key=key)
    # Concatenate messages to a single prompt; ask for pure JSON
    sys = "\n".join(m["content"] for m in messages if m["role"]=="system")
    usr = "\n".join(m["content"] for m in messages if m["role"]=="user")
    prompt = f"{sys}\n\n{usr}\n\nReturn ONLY valid JSON."
    model_name = os.getenv("GEMINI_MODEL","gemini-1.5-flash")
    r = genai.GenerativeModel(model_name).generate_content(prompt, request_options={"timeout":45})
    text = (r.text or "{}").strip()
    # try to locate JSON substring if extra tokens appear
    start = text.find("{")
    if start != -1:
        depth = 0
        end = None
        for i in range(start, len(text)):
            ch = text[i]
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

def chat_json(messages: List[Dict[str, str]], temperature=0.4, top_p=0.9, model: str = None) -> Dict[str, Any]:
    last_err = None
    # Try OpenAI with 2 retries if a key/client is available
    if _get_openai_client():
        for attempt in range(2):
            try:
                return _openai_chat_json(messages, temperature, top_p, model)
            except Exception as e:
                last_err = f"openai:{e}"; time.sleep(1.5 ** attempt)
    # Fallback to Gemini (1 try)
    try:
        return _gemini_chat_json(messages, temperature, top_p)
    except Exception as e:
        last_err = (last_err or "") + f"|gemini:{e}"
    return {"__error__": last_err or "llm_call_failed"}
