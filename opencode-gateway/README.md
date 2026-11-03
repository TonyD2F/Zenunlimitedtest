# OpenCode Local Gateway

A small, dependency-free OpenAI-compatible HTTP gateway for OpenCode v2 on Debian/proot. It forwards requests to **one configured provider endpoint**, keeps provider credentials out of OpenCode's config, streams responses, and passes upstream errors (including `429` and `Retry-After`) through unchanged. It does not rotate identities, proxies, or credentials, disguise requests, or bypass provider limits.

## Requirements

- Debian or Debian proot (Termux/proot-distro is fine)
- Node.js 18 or newer (`node --version`)
- An OpenAI-compatible API endpoint and credentials you are authorized to use

No Docker, native modules, or npm dependencies are required.

## Run

```sh
cd opencode-gateway
cp .env.example .env
# Edit .env and set UPSTREAM_BASE_URL, UPSTREAM_API_KEY, and a unique GATEWAY_API_KEY.
set -a
. ./.env
set +a
npm start
```

The gateway listens on `127.0.0.1:8787` by default. Check it with:

```sh
curl http://127.0.0.1:8787/health
```

The health endpoint reports the upstream origin only; it does not expose credentials. The gateway requires its local bearer key on `/v1/*` requests. Do not bind it to a public interface unless you have separately secured it.

## Configure OpenCode v2

Add a provider entry to your OpenCode config (commonly `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "local-gateway": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Local Gateway",
      "options": {
        "baseURL": "http://127.0.0.1:8787/v1",
        "apiKey": "replace-with-the-same-GATEWAY_API_KEY-from-.env"
      },
      "models": {
        "your-model-id": {
          "name": "Your provider model"
        }
      }
    }
  }
}
```

Replace `your-model-id` with a model your upstream account supports. Keep provider credentials in `.env`, not in the OpenCode config. The gateway forwards `/v1/*` requests and query strings to the configured base URL; it does not pick or invent model IDs.

## Debian/proot notes

- Install Node.js 18+ using a source appropriate for your Debian release; verify with `node --version`.
- Keep `BIND=127.0.0.1` for local use. A proot localhost listener is generally reachable by programs running in that same environment.
- Start the gateway in a persistent terminal or a process manager available in your environment. Stop it with `Ctrl-C`.
- If using another compatible provider, set `UPSTREAM_BASE_URL` to that provider's API base and configure any custom auth header/scheme it documents (`UPSTREAM_AUTH_HEADER`, `UPSTREAM_AUTH_SCHEME`).

## Behavior and safety

- No automatic retry on `403`, `429`, or other provider errors: the original status, body, and `Retry-After` header are passed back to the client.
- Uses a fixed upstream URL and the configured credentials; no public proxy lists, egress rotation, identity changes, or request fingerprint manipulation.
- Local bearer authentication is required. Never share `.env`; it contains secrets.
- The proxy accepts `GET` and `POST` under `/v1/`, limits request bodies to 64 MiB, and exposes `/health`.

## Test

```sh
npm test
```
