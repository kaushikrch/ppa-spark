from ..data_paths import PARQUET, SQLITE
import pandas as pd
from sqlalchemy import create_engine

_engine = None

def engine():
    global _engine
    if _engine is None:
        _engine = create_engine(f"sqlite:///{SQLITE}")
    return _engine

def to_parquet(df: pd.DataFrame, name: str):
    p = PARQUET / f"{name}.parquet"
    df.to_parquet(p, index=False)
    return str(p)

def write_table(df: pd.DataFrame, name: str, if_exists="replace"):
    df.to_sql(name, engine(), if_exists=if_exists, index=False)