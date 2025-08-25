import os
from functools import lru_cache

def _fetch_secret(env_key: str, default_secret: str, secret_env: str) -> str | None:
    """Generic helper to fetch secrets from env or Google Secret Manager."""
    key = os.getenv(env_key)
    if key:
        return key

    # Avoid long hangs when credentials or metadata server are absent
    project_id = os.getenv("PROJECT_ID") or os.getenv("GCP_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        return None

    # Only attempt Secret Manager if explicit credentials or Cloud Run metadata are present
    if not (os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("K_SERVICE")):
        return None

    try:
        from google.cloud import secretmanager

        secret_name = os.getenv(secret_env, default_secret)
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        response = client.access_secret_version(request={"name": name}, timeout=5)
        return response.payload.data.decode("UTF-8")
    except Exception:
        return None


@lru_cache()
def get_gemini_api_key() -> str | None:
    """Retrieve Gemini API key from env or Google Secret Manager."""
    return _fetch_secret("GEMINI_API_KEY", "gemini-api-key", "GEMINI_API_KEY_SECRET")


