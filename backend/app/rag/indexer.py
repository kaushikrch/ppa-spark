import pandas as pd
from ..utils.io import engine
from ..bootstrap import bootstrap_if_needed
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
        bootstrap_if_needed()
        con = engine().connect()
        tables = ["sku_master","price_weekly","demand_weekly","elasticities","attributes_importance"]
        blobs = []
        for t in tables:
            try:
                df = pd.read_sql(f"select * from {t} limit 5000", con)
                # Schema doc
                schema_text = df.dtypes.to_string()
                blobs.append(f"TABLE:{t}\nSECTION:schema\n{schema_text}")
                # Stats doc (numeric and categorical summary)
                try:
                    stats_text = df.describe(include='all', percentiles=[0.25,0.5,0.75]).to_csv()
                    blobs.append(f"TABLE:{t}\nSECTION:stats\n{stats_text}")
                except Exception:
                    pass
                # Samples doc (chunked)
                sample_csv = df.head(500).to_csv(index=False)
                chunk_size = 1800
                for i in range(0, len(sample_csv), chunk_size):
                    chunk = sample_csv[i:i+chunk_size]
                    blobs.append(f"TABLE:{t}\nSECTION:samples\nCHUNK:{i//chunk_size}\n{chunk}")
            except Exception:
                continue
        self.docs = blobs
        if blobs:
            self.vec = TfidfVectorizer(stop_words="english", ngram_range=(1,2))
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
