#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./open-anywhere.sh

Create a one-time OpenCode browser-pairing link that works from anywhere.
This uses OpenCode's built-in OpenTunnel transport; no ngrok account or port
forwarding is needed. OpenCode will ask before enabling internet access.

Run from an interactive terminal. This script intentionally does not accept
--yes, so the first-time internet-exposure confirmation cannot be skipped.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi
if [[ "$#" -ne 0 ]]; then
  usage >&2
  exit 2
fi
if ! command -v opencode >/dev/null 2>&1; then
  echo "OpenCode is not installed or is not on PATH." >&2
  exit 1
fi
if [[ ! -t 0 ]]; then
  echo "Run this command in an interactive terminal so you can approve remote access." >&2
  echo "No --yes option is passed automatically." >&2
  exit 1
fi

cat <<'NOTICE'
This creates a temporary, one-use browser sign-in link for your OpenCode server.
Anyone who gets the link can sign in until it expires (5 minutes) or is used.
Do not paste it into public chats, logs, or screenshots.

NOTICE
exec opencode pair --remote
