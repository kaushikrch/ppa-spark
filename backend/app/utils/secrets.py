import os
from functools import lru_cache

@lru_cache()
def get_gemini_api_key() -> str | None:
    """Retrieve Gemini API key from env or Google Secret Manager."""
    key = os.getenv("GEMINI_API_KEY")
    if key:
        return key
    try:
        from google.cloud import secretmanager
        project_id = os.getenv("PROJECT_ID") or os.getenv("GCP_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            return None
        secret_name = os.getenv("GEMINI_API_KEY_SECRET", "gemini-api-key")
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception:
        return None
