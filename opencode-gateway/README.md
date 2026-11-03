# OpenCode Local Gateway

A small, dependency-free OpenAI-compatible HTTP gateway for OpenCode v2 on Debian/proot. It forwards requests to **one configured provider endpoint**, keeps provider credentials out of OpenCode's config, streams responses, and passes upstream errors (including `429` and `Retry-After`) through unchanged. It does not rotate identities, proxies, or credentials, disguise requests, or bypass provider limits.

## Requirements

- Debian or Debian proot (Termux/proot-distro is fine)
- Node.js 18 or newer (`node --version`)
- An OpenAI-compatible API endpoint and credentials you are authorized to use

No Docker, native modules, or npm dependencies are required.

## One-command Debian/proot startup

From the repository root, create and edit the private environment file once:

```sh
cp opencode-gateway/.env.example opencode-gateway/.env
# Edit opencode-gateway/.env and set a valid UPSTREAM_API_KEY and a unique GATEWAY_API_KEY.
chmod +x start-opencode.sh
```

Install Node.js 18+ and OpenCode v2 if they are not already installed. Then start the gateway and OpenCode together with:

```sh
./start-opencode.sh
```

The launcher loads `opencode-gateway/.env`, starts the gateway if its health endpoint is not already available, exports the local gateway credential to OpenCode, and runs OpenCode in this repository using the included `opencode.json`. Any arguments are passed through to OpenCode. When the OpenCode process exits, a gateway started by the launcher is stopped. To run OpenCode against a different upstream model, change the selected model in `opencode.json` to one of the model IDs listed in its provider block (or edit that list to match models supported by your account).

The gateway listens on `127.0.0.1:8787` by default. Check it with:

```sh
curl http://127.0.0.1:8787/health
```

The health endpoint reports the upstream origin only; it does not expose credentials. The gateway requires its local bearer key on `/v1/*` requests. Do not bind it to a public interface unless you have separately secured it.

## OpenCode v2 config

The ready-to-use repo config is [`../opencode.json`](../opencode.json). Its custom-provider entry uses the OpenCode v2 `providers` / `package` / `settings.baseURL` schema and gets the local bearer credential from `OPENCODE_GATEWAY_API_KEY`, which the launcher supplies from `GATEWAY_API_KEY`. The upstream API credential stays in `.env` and is never placed in the OpenCode config.

For a different compatible upstream, set `UPSTREAM_BASE_URL` to its API base and configure any custom auth header/scheme it documents (`UPSTREAM_AUTH_HEADER`, `UPSTREAM_AUTH_SCHEME`). Make sure model IDs in `opencode.json` match the upstream's supported model IDs.

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
