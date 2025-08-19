import os
from pathlib import Path
from .utils.secrets import get_openai_api_key

# Environment variables and dependencies
OPENAI_API_KEY = get_openai_api_key() or ""
PROJECT_ID = os.getenv("PROJECT_ID", "")
REGION = os.getenv("REGION", "asia-south1")

# Data paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

