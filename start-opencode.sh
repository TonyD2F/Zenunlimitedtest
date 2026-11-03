#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT/opencode-gateway/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy opencode-gateway/.env.example to .env and add your API key." >&2
  exit 1
fi

# The .env file is a private, shell-compatible local configuration file.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [[ ( -z "${OPENROUTER_API_KEY:-}" || "$OPENROUTER_API_KEY" == replace-* ) && ( -z "${GEMINI_API_KEY:-}" || "$GEMINI_API_KEY" == replace-* ) ]]; then
  echo "Set at least one valid OPENROUTER_API_KEY or GEMINI_API_KEY in opencode-gateway/.env." >&2
  exit 1
fi
if [[ -z "${GATEWAY_API_KEY:-}" || "$GATEWAY_API_KEY" == replace-* ]]; then
  echo "Set a unique GATEWAY_API_KEY in opencode-gateway/.env." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18 or newer is required. Install it for Debian/proot, then rerun this script." >&2
  exit 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' ; then
  echo "Node.js 18 or newer is required (found $(node --version))." >&2
  exit 1
fi
if ! command -v opencode >/dev/null 2>&1; then
  echo "OpenCode is not installed. Install it with: curl -fsSL https://opencode.ai/v2/install | bash" >&2
  exit 1
fi

export OPENCODE_GATEWAY_API_KEY="$GATEWAY_API_KEY"
GATEWAY_URL="http://127.0.0.1:${PORT:-8787}"
GATEWAY_PID=""

health_check() {
  GATEWAY_URL="$GATEWAY_URL" node --input-type=module -e '
    try {
      const response = await fetch(`${process.env.GATEWAY_URL}/health`)
      const health = await response.json()
      process.exit(response.ok && health.ok === true ? 0 : 1)
    } catch {
      process.exit(1)
    }
  ' >/dev/null 2>&1
}

cleanup() {
  if [[ -n "$GATEWAY_PID" ]] && kill -0 "$GATEWAY_PID" 2>/dev/null; then
    kill "$GATEWAY_PID" 2>/dev/null || true
    wait "$GATEWAY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if ! health_check; then
  node "$ROOT/opencode-gateway/src/server.mjs" >/dev/null 2>&1 &
  GATEWAY_PID=$!
  for _ in {1..30}; do
    if health_check; then
      break
    fi
    if ! kill -0 "$GATEWAY_PID" 2>/dev/null; then
      echo "Gateway exited before becoming healthy. Check its configuration and port ${PORT:-8787}." >&2
      exit 1
    fi
    sleep 1
  done
fi

if ! health_check; then
  echo "Gateway did not become healthy at $GATEWAY_URL/health." >&2
  exit 1
fi

cd "$ROOT"
opencode --standalone "$@"
