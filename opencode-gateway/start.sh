#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi

if [[ -z "${UPSTREAM_BASE_URL:-}" || -z "${GATEWAY_API_KEY:-}" ]]; then
  echo "Missing required environment variables. Copy .env.example to .env and fill in values." >&2
  exit 1
fi

node src/server.mjs
