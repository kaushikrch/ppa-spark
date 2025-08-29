import os
import logging
from typing import Optional
from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from .schemas import HuddleResponse
from .synth_data import gen_weekly_data
from .models.elasticities import fit_elasticities
from .models.simulator import simulate_price_change, simulate_delist
from .models.optimizer import run_optimizer
from .rag.store import rag
from .agents.orchestrator import agentic_huddle, agentic_huddle_v2
from .utils.secrets import get_gemini_api_key
from .utils.vertextai import init_vertexai
from .bootstrap import bootstrap_if_needed
from functools import lru_cache
import threading

# Configure application logging early to tame noisy dependencies
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))

# PyArrow can produce verbose output; allow tuning via env
PYARROW_LOG_LEVEL = os.getenv("PYARROW_LOG_LEVEL", "ERROR").upper()
try:
    import pyarrow as pa

    pa.set_log_level(getattr(pa.lib.ArrowLogLevel, PYARROW_LOG_LEVEL))
    logging.getLogger("pyarrow").setLevel(
        getattr(logging, PYARROW_LOG_LEVEL, logging.ERROR)
    )
    logging.getLogger(__name__).debug("PyArrow %s loaded", pa.__version__)
except ModuleNotFoundError:
    logging.getLogger(__name__).info(
        "pyarrow not installed; parquet operations will use pandas"
    )
except Exception as exc:
    logging.getLogger(__name__).warning(
        "Failed to configure pyarrow logging: %s", exc
    )

app = FastAPI(title="iNRM PPA+Assortment API", version="1.0.0")


def _bootstrap_data():
    """Ensure synthetic data and model tables exist for huddle endpoints."""
    bootstrap_if_needed()


@app.on_event("startup")
def _startup_thread():
    # Run bootstrap in background so container starts listening quickly
    threading.Thread(target=_bootstrap_data, daemon=True).start()

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

@app.api_route("/healthz", methods=["GET", "HEAD"], include_in_schema=False)
def healthz():
    """Health check endpoint used by Cloud Run and monitoring probes."""
    return {"ok": True}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/data/generate")
def generate(background_tasks: BackgroundTasks):
    """Kick off synthetic data generation in the background.

    Running the full data generation can take a while which previously caused
    the Cloud Run request to time out (504).  By delegating the heavy lifting to
    a background task we return control to the caller immediately while the
    data is produced asynchronously.
    """
    background_tasks.add_task(gen_weekly_data)
    return {"ok": True, "message": "Data generation started"}

@app.post("/models/train")
def train(background_tasks: BackgroundTasks):
    """Trigger model training asynchronously.

    Training elasticities can be a long running process which previously
    resulted in 5xx responses when the request exceeded the timeout.  Running
    the training in a background task allows the API to respond immediately.
    """
    background_tasks.add_task(fit_elasticities)
    return {"ok": True, "message": "Model training started"}

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

@app.post("/rag/build")
def rag_build():
    return rag.build()

@app.get("/rag/search")
def rag_search(q: str, topk: int = 4):
    return {"hits": rag.query(q, topk=topk)}

@lru_cache()
def _get_model(name: str):
    from vertexai.generative_models import GenerativeModel
    return GenerativeModel(name)


@app.post("/genai/insight")
def insight(payload: dict):
    import pandas as pd
    from vertexai.generative_models import GenerationConfig

    panel_id = payload.get("panel_id", "unknown")
    q = payload.get("q", "Explain the chart succinctly")
    data = payload.get("data")

    api_key = get_gemini_api_key()
    if not api_key:
        return {"insight": "Gemini API key not configured."}

    try:
        init_vertexai(api_key)
    except Exception:
        return {"insight": "GCP project ID not configured."}
    model = _get_model(os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))

    if data:
        df = pd.DataFrame(data)
        table = df.to_csv(index=False)
        context = f"Data table (CSV):\n{table}"
    else:
        hits = rag.query(q)
        context = "\n".join([h["text"][:800] for h in hits[:2]])

    prompt = f"""As a data analyst, explain this chart/data insight concisely:

Panel: {panel_id}
Question: {q}

Data Context:
{context}

Provide a 2-3 sentence insight focusing on key business implications."""

    try:
        response = model.generate_content(prompt, generation_config=GenerationConfig(temperature=0.4))
        return {"insight": response.text}
    except Exception as e:
        return {"insight": f"Unable to generate insight: {str(e)}"}

@app.post("/agents/huddle")
def huddle(question: str, budget: float = 500000):
    result = agentic_huddle(question, budget)
    return result

@app.post("/huddle/run", response_model=HuddleResponse)
def huddle_run(
    q: Optional[str] = Query(None),
    budget: float = Query(500000),
    rounds: int = Query(3),
    body: dict | None = None,
):
    if body:
        q = body.get("q", q)
        budget = float(body.get("budget", budget))
        rounds = min(int(body.get("rounds", rounds)), 3)
    rounds = min(rounds, 3)
    if not q:
        raise HTTPException(status_code=400, detail="Missing 'q' (question)")
    return agentic_huddle_v2(q, budget=budget, debate_rounds=rounds)
