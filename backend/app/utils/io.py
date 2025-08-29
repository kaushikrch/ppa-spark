from ..data_paths import PARQUET, SQLITE
import pandas as pd
from sqlalchemy import create_engine

_engine = None


def engine():
    global _engine
    if _engine is None:
        _engine = create_engine(f"sqlite:///{SQLITE}")
    return _engine


def to_parquet(df: pd.DataFrame, name: str) -> str:
    """Write a DataFrame to parquet using pyarrow when available.

    Falls back to pandas' built-in implementation if pyarrow isn't installed.
    """

    p = PARQUET / f"{name}.parquet"
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq

        table = pa.Table.from_pandas(df)
        pq.write_table(table, p)
    except Exception:
        # Either pyarrow isn't installed or conversion failed; fall back to pandas.
        df.to_parquet(p, index=False)
    return str(p)


def write_table(df: pd.DataFrame, name: str, if_exists: str = "replace") -> None:
    df.to_sql(name, engine(), if_exists=if_exists, index=False)
