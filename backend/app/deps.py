import os
from pathlib import Path

# Environment variables and dependencies
PROJECT_ID = os.getenv("PROJECT_ID", "")
REGION = os.getenv("REGION", "asia-south1")

# Data paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

