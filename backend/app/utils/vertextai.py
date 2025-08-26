import os
import vertexai
from .gcp import get_project_id


def init_vertexai(api_key: str | None = None) -> None:
    """Initialize Vertex AI using configured project and region."""
    project = get_project_id()
    region = os.getenv("GCP_REGION") or os.getenv("REGION") or "us-central1"
    vertexai.init(project=project, location=region, api_key=api_key)
