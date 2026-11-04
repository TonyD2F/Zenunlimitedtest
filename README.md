# OpenCode Local Gateway

A small, quota-respecting OpenAI-compatible gateway for OpenCode v2 on Debian/proot. It can route requests to either OpenRouter's free-model router or Gemini using your own API keys. Provider limits and errors are preserved; the setup does not claim unlimited usage or bypass quotas.

## Quick start

1. Install Node.js 18+ and OpenCode v2.
2. If `opencode-gateway/.env` does not exist, copy `.env.example` there. Otherwise, edit the existing file without overwriting it; add at least one valid provider key (`OPENROUTER_API_KEY` and/or `GEMINI_API_KEY`) and a unique `GATEWAY_API_KEY`.
3. Run `./start-opencode.sh` from the repository root.

The default model is OpenRouter Free. Select `local-gateway/gemini-flash` in OpenCode to use Gemini. Read [`opencode-gateway/README.md`](opencode-gateway/README.md) for model selection, configuration, and tests. Keep `.env` private; it contains your API keys.

## OpenCode in a browser from anywhere

OpenCode v2 already includes a browser UI and a remote-access tunnel, so you do not need ngrok or to expose the gateway port. From an interactive terminal, run:

```sh
./open-anywhere.sh
```

OpenCode prints a one-time pairing link and asks you to approve internet exposure the first time. Open the link in your browser; it expires after five minutes or one use, and the browser session remains signed in for up to 30 days. Treat the link like a password and do not share it. The script intentionally requires an interactive terminal and never auto-accepts exposure.

This pairs with OpenCode's shared background service. The existing `./start-opencode.sh` launcher runs OpenCode with `--standalone`, which is a separate private server and is not the server paired by this tool. The gateway on port 8787 is only for model requests; keep it bound to `127.0.0.1` and do not tunnel or publish that port.

To turn off remote access, run `opencode service set remote false` and then `opencode service start`. To revoke existing browser sessions too, change the OpenCode service password; changing it signs sessions out.

The repository also contains `opencode-unlimited.zip`, an unmodified legacy archive unrelated to this setup. Do not run that archive.
