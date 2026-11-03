#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -f .env ]]; then
  set -a
  . ./.env
  set +a
fi

if [[ ( -z "${OPENROUTER_API_KEY:-}" || "$OPENROUTER_API_KEY" == replace-* ) && ( -z "${GEMINI_API_KEY:-}" || "$GEMINI_API_KEY" == replace-* ) ]]; then
  echo "Set at least one valid OPENROUTER_API_KEY or GEMINI_API_KEY in .env." >&2
  exit 1
fi
if [[ -z "${GATEWAY_API_KEY:-}" || "$GATEWAY_API_KEY" == replace-* ]]; then
  echo "Set a unique GATEWAY_API_KEY in .env." >&2
  exit 1
fi

node src/server.mjs
