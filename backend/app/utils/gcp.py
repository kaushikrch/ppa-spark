import os
import google.auth


def get_project_id() -> str:
    """Return the active GCP project ID or raise if missing."""
    project = (
        os.getenv("PROJECT_ID")
        or os.getenv("GCP_PROJECT")
        or os.getenv("GOOGLE_CLOUD_PROJECT")
    )
    if not project:
        try:
            _, project = google.auth.default()
        except Exception:
            project = None
    if not project:
        raise RuntimeError("gcp_project_missing")
    return project
