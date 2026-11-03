#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the screenshot output directory.}"
cd "$PROJECT_DIR"
export CAPTURE_STRICT="${CAPTURE_STRICT:-1}"
export CAPTURE_READY_SELECTOR="${CAPTURE_READY_SELECTOR:-main}"
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
