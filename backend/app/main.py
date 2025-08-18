import os
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .synth_data import gen_weekly_data
from .models.elasticities import fit_elasticities
from .models.simulator import simulate_price_change, simulate_delist
from .models.optimizer import run_optimizer
from .rag.indexer import rag
from .agents.orchestrator import agentic_huddle, agentic_huddle_v2

app = FastAPI(title="iNRM PPA+Assortment API", version="1.0.0")

# CORS for frontend (allow specific origins or *)
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
allow_list = [o.strip() for o in CORS_ORIGINS.split(",")] if CORS_ORIGINS else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "iNRM PPA+Assortment API", "version": "1.0.0"}

@app.post("/data/generate")
def generate():
    gen_weekly_data()
    return {"ok": True, "message": "Data generated successfully"}

@app.post("/models/train")
def train():
    fit_elasticities()
    return {"ok": True, "message": "Models trained successfully"}

@app.post("/simulate/price")
def simulate_price(changes: dict):
    agg, rows = simulate_price_change(changes)
    return {"agg": agg.to_dict(orient="records"), "rows": rows.to_dict(orient="records")}

@app.post("/simulate/delist")
def simulate_delist_api(ids: list[int]):
    df = simulate_delist(ids)
    return {"rows": df.to_dict(orient="records")}

@app.post("/optimize/run")
def optimize(round: int = 1):
    sol, kpis = run_optimizer(round=round)
    return {"solution": sol, "kpis": kpis}

@app.get("/rag/search")
def rag_search(q: str = Query(...)):
    hits = rag.query(q)
    return {"hits": [{"doc": h[0], "score": h[1]} for h in hits]}

@app.get("/genai/insight")
def insight(panel_id: str, q: str = "Explain the chart succinctly"):
    import google.generativeai as genai
    
    # Configure Gemini
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return {"insight": "Gemini API key not configured."}
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Get relevant data context from RAG
    hits = rag.query(q)
    context = "\n".join([h[0][:800] for h, _ in hits[:2]])
    
    # Generate insight using Gemini
    prompt = f"""As a data analyst, explain this chart/data insight concisely:

Panel: {panel_id}
Question: {q}

Data Context:
{context}

Provide a 2-3 sentence insight focusing on key business implications."""

    try:
        response = model.generate_content(prompt)
        return {"insight": response.text}
    except Exception as e:
        return {"insight": f"Unable to generate insight: {str(e)}"}

@app.post("/agents/huddle")
def huddle(question: str, budget: float = 500000):
    result = agentic_huddle(question, budget)
    return result

@app.post("/huddle/run")
def huddle_run(
    q: Optional[str] = Query(None),
    budget: float = Query(500000),
    body: dict | None = None
):
    if body:
        q = body.get("q", q)
        budget = float(body.get("budget", budget))
    if not q:
        raise HTTPException(status_code=400, detail="Missing 'q' (question)")
    return agentic_huddle_v2(q, budget=budget)

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/healthz")
def healthz():
    return {"ok": True}