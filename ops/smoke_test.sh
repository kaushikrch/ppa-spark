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
BACKEND_RESP=$(curl -fsS "$API_URL/healthz")
echo "  Response: $BACKEND_RESP"
echo "$BACKEND_RESP" | grep -q '"ok"' || { echo "Backend health check failed" >&2; exit 1; }

# Frontend smoke test
echo "🔎 Checking frontend at $UI_URL"
FRONTEND_RESP=$(curl -fsS "$UI_URL")
if ! echo "$FRONTEND_RESP" | grep -qi '<title>'; then
  echo "Frontend did not return expected HTML" >&2
  exit 1
fi

echo "✅ Smoke tests passed"
