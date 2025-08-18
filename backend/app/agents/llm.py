import os, json, time
from typing import List, Dict, Any

# Try OpenAI first
OPENAI_OK = bool(os.getenv("OPENAI_API_KEY"))
GEMINI_OK = bool(os.getenv("GEMINI_API_KEY"))

if OPENAI_OK:
    from openai import OpenAI
    _oai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def _openai_chat_json(messages, temperature, top_p, model):
    resp = _oai.chat.completions.create(
        model=model or os.getenv("OPENAI_MODEL","gpt-4o-mini"),
        temperature=temperature, top_p=top_p,
        response_format={"type": "json_object"},
        messages=messages, timeout=45
    )
    content = resp.choices[0].message.content or "{}"
    return json.loads(content)

def _gemini_chat_json(messages, temperature, top_p):
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    # Concatenate messages to a single prompt; ask for pure JSON
    sys = "\n".join(m["content"] for m in messages if m["role"]=="system")
    usr = "\n".join(m["content"] for m in messages if m["role"]=="user")
    prompt = f"{sys}\n\n{usr}\n\nReturn ONLY valid JSON."
    model_name = os.getenv("GEMINI_MODEL","gemini-1.5-flash")
    r = genai.GenerativeModel(model_name).generate_content(prompt, request_options={"timeout":45})
    text = (r.text or "{}").strip()
    # try to locate JSON substring if extra tokens appear
    start = text.find("{"); end = text.rfind("}")
    if start!=-1 and end!=-1 and end>start:
        text = text[start:end+1]
    return json.loads(text)

def chat_json(messages: List[Dict[str, str]], temperature=0.4, top_p=0.9, model: str = None) -> Dict[str, Any]:
    last_err = None
    # Try OpenAI with 2 retries
    if OPENAI_OK:
        for attempt in range(2):
            try:
                return _openai_chat_json(messages, temperature, top_p, model)
            except Exception as e:
                last_err = f"openai:{e}"; time.sleep(1.5 ** attempt)
    # Fallback to Gemini (1 try)
    if GEMINI_OK:
        try:
            return _gemini_chat_json(messages, temperature, top_p)
        except Exception as e:
            last_err = (last_err or "") + f"|gemini:{e}"
    return {"__error__": last_err or "llm_call_failed"}