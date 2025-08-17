from pathlib import Path
BASE = Path(__file__).resolve().parents[1] / "data"
BASE.mkdir(parents=True, exist_ok=True)
PARQUET = BASE / "parquet"
PARQUET.mkdir(exist_ok=True)
SQLITE = BASE / "inrm_demo.sqlite"