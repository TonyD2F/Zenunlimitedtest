# OpenCode Local Gateway

A small, quota-respecting OpenAI-compatible gateway for OpenCode v2 on Debian/proot. It forwards requests to one provider endpoint configured by you, streams responses, and preserves upstream errors and rate-limit responses. It does not claim to provide unlimited usage or bypass provider limits.

## Quick start

1. Install Node.js 18+ and OpenCode v2.
2. Copy `opencode-gateway/.env.example` to `opencode-gateway/.env` and set your valid upstream API key and a unique local gateway key.
3. Run `./start-opencode.sh` from the repository root.

This starts the local gateway and launches OpenCode with the ready-to-use v2 config in [`opencode.json`](opencode.json). Read [`opencode-gateway/README.md`](opencode-gateway/README.md) for configuration, supported models, and tests. The credentials in `.env` are local setup values; the included upstream key is only a placeholder, not a working credential.

The repository also contains `opencode-unlimited.zip`, an unmodified legacy archive unrelated to this setup. Do not run that archive.
