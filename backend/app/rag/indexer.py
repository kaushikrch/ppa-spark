import pandas as pd
from ..utils.io import engine
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

class SimpleTableRAG:
    def __init__(self):
        self.docs = []
        self.vec = None
        self.mat = None

    def build(self):
        if not SKLEARN_AVAILABLE:
            return
        con = engine().connect()
        tables = ["sku_master","price_weekly","demand_weekly","elasticities","attributes_importance"]
        blobs = []
        for t in tables:
            try:
                df = pd.read_sql(f"select * from {t} limit 5000", con)
                text = df.to_csv(index=False)
                blobs.append(f"TABLE:{t}\n{text}")
            except:
                continue
        self.docs = blobs
        if blobs:
            self.vec = TfidfVectorizer(stop_words="english")
            self.mat = self.vec.fit_transform(self.docs)

    def query(self, q, topk=3):
        if not SKLEARN_AVAILABLE or self.mat is None: 
            self.build()
        if self.mat is None:
            return [("No data available", 0.0)]
        qv = self.vec.transform([q])
        sims = cosine_similarity(qv, self.mat).ravel()
        idx = sims.argsort()[::-1][:topk]
        return [(self.docs[i][:5000], float(sims[i])) for i in idx]

rag = SimpleTableRAG()