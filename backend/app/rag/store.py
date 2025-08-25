import os, io, json, math
from typing import List, Tuple, Dict
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from ..utils.io import engine
from ..bootstrap import bootstrap_if_needed
from ..utils.secrets import get_gemini_api_key
import vertexai
from vertexai.language_models import TextEmbeddingModel

try:
    import faiss  # optional
    FAISS_OK = True
except Exception:
    FAISS_OK = False

_DIM = 768  # default dimension for Gemini embeddings
_EMBED_MODEL: TextEmbeddingModel | None = None


def _embed_texts(texts: List[str]) -> np.ndarray:
    """Embed via Vertex AI Gemini; fallback to zeros if fails."""
    global _EMBED_MODEL
    try:
        key = get_gemini_api_key()
        if not key:
            raise Exception("No Gemini API key")
        project = (
            os.getenv("PROJECT_ID")
            or os.getenv("GCP_PROJECT")
            or os.getenv("GOOGLE_CLOUD_PROJECT")
            or "dummy-project"
        )
        region = os.getenv("GCP_REGION") or os.getenv("REGION") or "us-central1"
        vertexai.init(project=project, location=region, api_key=key)
        if _EMBED_MODEL is None:
            model_name = os.getenv("GEMINI_EMBED_MODEL", "text-embedding-004")
            _EMBED_MODEL = TextEmbeddingModel.from_pretrained(model_name)
        embeddings = _EMBED_MODEL.get_embeddings(texts)
        vecs = [e.values for e in embeddings]
        return np.array(vecs, dtype="float32")
    except Exception:
        return np.zeros((len(texts), _DIM), dtype="float32")

def _chunk_text(table: str, df: pd.DataFrame, max_lines=400, chunk_char=1800) -> List[Tuple[str, str]]:
    """Sample rows to keep artifacts small but realistic"""
    sample = df.sample(min(len(df), max_lines), random_state=42) if len(df) > max_lines else df
    csv = sample.to_csv(index=False)
    # Chunk by characters
    chunks, cursor = [], 0
    while cursor < len(csv):
        frag = csv[cursor:cursor+chunk_char]
        chunks.append((table, f"TABLE:{table}\n{frag}"))
        cursor += chunk_char
    return chunks

class RAGStore:
    def __init__(self):
        self.docs: List[str] = []
        self.meta: List[Dict] = []
        self.faiss = None
        self.tfidf = None
        self.mat = None
        self.mode = "tfidf"  # or "faiss"

    def build(self, tables: List[str] = None):
        if tables is None:
            tables = ["sku_master", "price_weekly", "demand_weekly", "elasticities", "attributes_importance"]

        try:
            bootstrap_if_needed()
            con = engine().connect()
        except Exception:
            return {"docs": 0, "mode": "error", "error": "Database connection failed"}
        
        blobs, meta = [], []
        for t in tables:
            try:
                df = pd.read_sql(f"select * from {t} limit 15000", con)
                for (tbl, chunk) in _chunk_text(t, df):
                    blobs.append(chunk)
                    meta.append({"table": tbl})
            except Exception:
                continue
        
        self.docs, self.meta = blobs, meta

        # Try FAISS with Gemini embeddings; fallback to TF-IDF
        use_dense = bool(get_gemini_api_key()) and FAISS_OK
        if use_dense:
            try:
                vecs = _embed_texts(self.docs)
                if vecs.shape[1] == _DIM:
                    index = faiss.IndexFlatIP(_DIM)
                    # normalize for cosine
                    faiss.normalize_L2(vecs)
                    index.add(vecs)
                    self.faiss = index
                    self.mode = "faiss"
            except Exception:
                pass
        
        if self.faiss is None:
            try:
                self.tfidf = TfidfVectorizer(stop_words="english", max_features=50000)
                self.mat = self.tfidf.fit_transform(self.docs)
                self.mode = "tfidf"
            except Exception:
                return {"docs": len(self.docs), "mode": "error", "error": "TF-IDF failed"}
        
        return {"docs": len(self.docs), "mode": self.mode}

    def query(self, q: str, topk: int = 4):
        if not self.docs:
            self.build()
        
        if not self.docs:
            return []
        
        try:
            if self.mode == "faiss" and self.faiss is not None:
                qv = _embed_texts([q]).astype("float32")
                faiss.normalize_L2(qv)
                D, I = self.faiss.search(qv, topk)
                idxs = I[0].tolist()
                sims = D[0].tolist()
            else:
                qv = self.tfidf.transform([q])
                sims = cosine_similarity(qv, self.mat).ravel()
                idxs = sims.argsort()[::-1][:topk].tolist()
                sims = sims[idxs].tolist()
            
            out = []
            for i, s in zip(idxs, sims):
                if i < len(self.docs):
                    out.append({
                        "text": self.docs[i], 
                        "score": float(s), 
                        "table": self.meta[i]["table"]
                    })
            return out
        except Exception:
            return []

rag = RAGStore()
