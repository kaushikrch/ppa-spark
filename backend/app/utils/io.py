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
    """Persist a DataFrame to parquet when possible.

    If neither ``pyarrow`` nor ``fastparquet`` is available, fall back to a
    lightweight CSV dump so data generation still succeeds without optional
    dependencies.  Returns the path of the written file.
    """

    p = PARQUET / f"{name}.parquet"
    try:
        import pyarrow as pa  # type: ignore
        import pyarrow.parquet as pq  # type: ignore

        table = pa.Table.from_pandas(df)
        pq.write_table(table, p)
        return str(p)
    except Exception:
        # ``df.to_parquet`` would still require an engine; use CSV instead.
        csv_path = PARQUET / f"{name}.csv"
        df.to_csv(csv_path, index=False)
        return str(csv_path)


def write_table(df: pd.DataFrame, name: str, if_exists: str = "replace") -> None:
    df.to_sql(name, engine(), if_exists=if_exists, index=False)
