# OpenCode Local Gateway

A small, quota-respecting OpenAI-compatible gateway for OpenCode v2 on Debian/proot. It can route requests to either OpenRouter's free-model router or Gemini using your own API keys. Provider limits and errors are preserved; the setup does not claim unlimited usage or bypass quotas.

## Quick start

1. Install Node.js 18+ and OpenCode v2.
2. If `opencode-gateway/.env` does not exist, copy `.env.example` there. Otherwise, edit the existing file without overwriting it; add at least one valid provider key (`OPENROUTER_API_KEY` and/or `GEMINI_API_KEY`) and a unique `GATEWAY_API_KEY`.
3. Run `./start-opencode.sh` from the repository root.

The default model is OpenRouter Free. Select `local-gateway/gemini-flash` in OpenCode to use Gemini. Read [`opencode-gateway/README.md`](opencode-gateway/README.md) for model selection, configuration, and tests. Keep `.env` private; it contains your API keys.

The repository also contains `opencode-unlimited.zip`, an unmodified legacy archive unrelated to this setup. Do not run that archive.
