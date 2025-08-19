#!/usr/bin/env bash
set -euo pipefail

API_URL=${1:-}
UI_URL=${2:-}

if [[ -z "$API_URL" || -z "$UI_URL" ]]; then
  echo "Usage: $0 <api_url> <ui_url>" >&2
  exit 1
fi

# Backend smoke test
echo "🔎 Checking backend at $API_URL/healthz"
# Try /healthz first; fall back to /health if needed
if ! BACKEND_RESP=$(curl -fsS "$API_URL/healthz" 2>/dev/null); then
  echo "  /healthz not found, trying /health"
  BACKEND_RESP=$(curl -fsS "$API_URL/health" 2>/dev/null) || {
    echo "Backend health check failed" >&2; exit 1; }
fi
echo "  Response: $BACKEND_RESP"
# Accept either {"ok": true} or {"status": "healthy"}
echo "$BACKEND_RESP" | grep -Eq '"ok"|"status"' || { echo "Backend health check failed" >&2; exit 1; }

# Frontend smoke test
echo "🔎 Checking frontend at $UI_URL"
FRONTEND_RESP=$(curl -fsS "$UI_URL")
if ! echo "$FRONTEND_RESP" | grep -qi '<title>'; then
  echo "Frontend did not return expected HTML" >&2
  exit 1
fi

echo "✅ Smoke tests passed"
