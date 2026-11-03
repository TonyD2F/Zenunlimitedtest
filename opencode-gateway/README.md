# OpenCode Local Gateway

A small, dependency-free OpenAI-compatible gateway for OpenCode v2 on Debian/proot. It lets you select either OpenRouter's free-model router or the Gemini API from one OpenCode provider config. Each request is sent only to the selected provider using that provider's own key and quota. Upstream errors (including `429` and `Retry-After`) pass through unchanged; there are no retries, key rotations, or limit bypasses.

## Requirements

- Debian or Debian proot (Termux/proot-distro is fine)
- Node.js 18 or newer (`node --version`)
- Your OpenRouter and/or Gemini API key

No Docker, native modules, or npm dependencies are required.

## One-command Debian/proot startup

From the repository root, create the private environment file if it does not exist, then edit it:

```sh
[ -f opencode-gateway/.env ] || cp opencode-gateway/.env.example opencode-gateway/.env
chmod 600 opencode-gateway/.env
# Add at least one provider key and a unique GATEWAY_API_KEY.
chmod +x start-opencode.sh
```

If upgrading an older setup, keep the existing `.env` and add `OPENROUTER_API_KEY` and/or `GEMINI_API_KEY`; the legacy `UPSTREAM_*` values are no longer used.

Install Node.js 18+ and OpenCode v2 if they are not already installed. Then start the gateway and OpenCode together with:

```sh
./start-opencode.sh
```

The launcher loads `opencode-gateway/.env`, starts the gateway if its health endpoint is not already available, exports the local gateway credential to OpenCode, and runs OpenCode in this repository using `opencode.json`. Any arguments are passed through to OpenCode. When OpenCode exits, a gateway started by the launcher is stopped.

The default model is `local-gateway/openrouter-free`. Select `local-gateway/gemini-flash` in OpenCode to use Gemini. You may set either provider key or both; models whose key is not configured will return a clear error. Both aliases can be pointed at another supported model by changing `OPENROUTER_MODEL` or `GEMINI_MODEL` in `.env`.

## Provider model IDs

- **OpenRouter:** The default upstream model is `openrouter/free`, OpenRouter's free-model router. It selects from eligible free models according to OpenRouter's current availability. To pin another model, set `OPENROUTER_MODEL` to its exact OpenRouter model ID.
- **Gemini:** The default upstream model is `gemini-3.8-flash` at Google's OpenAI-compatible endpoint. To use another model available to your API key, set `GEMINI_MODEL` to its exact model ID.

Free-tier model availability, rate limits, and quotas are determined by each provider and can change. If a provider reports a limit or unavailable model, wait or choose another model supported by your account; this setup does not circumvent those limits.

## Gateway details

The gateway listens on `127.0.0.1:8787` by default. Check it with:

```sh
curl http://127.0.0.1:8787/health
```

The health endpoint reports configured provider names and origins only; it does not expose credentials. The gateway requires its local bearer key on `/v1/*` requests. Keep `BIND=127.0.0.1`; do not bind it to a public interface unless you have separately secured it.

The ready-to-use repo config is [`../opencode.json`](../opencode.json). Its custom-provider entry uses the OpenCode v2 `providers` / `package` / `settings.baseURL` schema and gets the local bearer credential from `OPENCODE_GATEWAY_API_KEY`, which the launcher supplies from `GATEWAY_API_KEY`. Upstream credentials remain in `.env` and are never placed in the OpenCode config.

## Behavior and safety

- No automatic retries on `403`, `429`, or other provider errors; status, response body, and `Retry-After` are passed through.
- Fixed provider endpoints and configured credentials; no public proxy lists, egress rotation, identity changes, or request fingerprint manipulation.
- Local bearer authentication is required. Never share `.env`; it contains secrets.
- The proxy accepts `GET` and `POST` under `/v1/`, limits request bodies to 64 MiB, and exposes `/health`.

## Test

```sh
cd opencode-gateway
npm test
```
