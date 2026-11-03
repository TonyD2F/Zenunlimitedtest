#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
WEB_META_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
PORT="${PORT:-3000}"
export PROJECT_DIR PORT

cd "$PROJECT_DIR"
/usr/bin/time -p mkdir -p "$PROJECT_DIR/dist" "$WEB_META_DIR"
/usr/bin/time -p npm --prefix "$PROJECT_DIR/opencode-gateway" install --ignore-scripts --no-audit --no-fund --package-lock=false

/usr/bin/time -p tee "$PROJECT_DIR/dist/index.html" >/dev/null <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#10131c">
  <meta name="description" content="A small, transparent OpenAI-compatible gateway for your chosen provider.">
  <title>OpenCode Local Gateway</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #10131c; color: #f5f6fa; font-synthesis: none; }
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 320px; background: radial-gradient(ellipse at 75% 4%, #202c42 0, transparent 38rem), #10131c; }
    .shell { width: min(1120px, calc(100% - 48px)); margin: 0 auto; }
    header { height: 82px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #ffffff14; }
    .brand { display: flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 680; letter-spacing: -.02em; }
    .mark { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid #85e0c355; border-radius: 11px; color: #8ce2c6; background: #6ed6b413; font-size: 18px; }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 11px; color: #bbcad5; border: 1px solid #ffffff1b; border-radius: 99px; font-size: 12px; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #72dfb8; box-shadow: 0 0 12px #72dfb899; }
    main { padding: 76px 0 82px; }
    .eyebrow { color: #8ce2c6; font-size: 12px; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 18px 0; font-size: clamp(42px, 7vw, 76px); line-height: 1.02; letter-spacing: -.065em; }
    h1 span { color: #8ce2c6; }
    .intro { max-width: 600px; margin: 0; color: #aab4c4; font-size: 17px; line-height: 1.7; }
    .flow { display: grid; grid-template-columns: 1fr 54px 1fr 54px 1fr; align-items: center; margin: 54px 0 22px; }
    .node { min-height: 122px; display: flex; flex-direction: column; justify-content: center; gap: 9px; padding: 20px; border: 1px solid #ffffff19; border-radius: 15px; background: #171d29cc; }
    .node small { color: #77869b; font-size: 11px; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; }
    .node strong { font-size: 16px; }
    .node span { color: #aab4c4; font-size: 13px; }
    .arrow { color: #74d8b8; text-align: center; font-size: 21px; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 40px; }
    .card { padding: 23px 24px; border: 1px solid #ffffff19; border-radius: 15px; background: #171d29b8; }
    .card h2 { margin: 0 0 9px; font-size: 15px; }
    .card p { margin: 0; color: #aab4c4; font-size: 13px; line-height: 1.7; }
    .code { margin-top: 19px; padding: 14px 16px; overflow-wrap: anywhere; border: 1px solid #ffffff12; border-radius: 10px; background: #0c1018; color: #a9e5d0; font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace; }
    footer { display: flex; justify-content: space-between; gap: 20px; padding: 22px 0 30px; border-top: 1px solid #ffffff14; color: #778397; font-size: 12px; }
    @media (max-width: 680px) {
      .shell { width: min(100% - 36px, 520px); }
      header { height: 70px; }
      .badge { padding: 7px 9px; font-size: 11px; }
      main { padding: 54px 0 56px; }
      h1 { font-size: clamp(42px, 12vw, 60px); }
      .intro { font-size: 15px; }
      .flow { grid-template-columns: 1fr; gap: 10px; margin: 34px 0 18px; }
      .node { min-height: auto; padding: 17px; }
      .arrow { transform: rotate(90deg); height: 20px; }
      .details { grid-template-columns: 1fr; gap: 12px; margin-top: 26px; }
      .card { padding: 20px; }
      footer { flex-direction: column; gap: 7px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div class="brand"><div class="mark" aria-hidden="true">↗</div><span>OpenCode Local Gateway</span></div>
      <div class="badge"><span class="dot" aria-hidden="true"></span> Single-provider routing</div>
    </header>
    <main>
      <div class="eyebrow">Your endpoint. Your rules.</div>
      <h1>A transparent bridge to <span>your model provider.</span></h1>
      <p class="intro">Connect OpenCode to one OpenAI-compatible endpoint through a small local gateway. Keep provider credentials out of editor configuration and retain clear, predictable control over requests.</p>
      <section class="flow" aria-label="Request flow">
        <div class="node"><small>01 · Client</small><strong>OpenCode</strong><span>Your configured model and request</span></div>
        <div class="arrow" aria-hidden="true">→</div>
        <div class="node"><small>02 · Local service</small><strong>Gateway</strong><span>Bearer auth · streaming · no rotation</span></div>
        <div class="arrow" aria-hidden="true">→</div>
        <div class="node"><small>03 · Upstream</small><strong>Your provider</strong><span>One endpoint you authorize</span></div>
      </section>
      <section class="details" aria-label="Gateway details">
        <article class="card"><h2>Designed to stay predictable</h2><p>Upstream responses, including rate limits, pass through unchanged. There are no identity or egress changes and no automatic retries.</p></article>
        <article class="card"><h2>Run it locally</h2><p>Configure your endpoint and keys in the gateway environment, then point OpenCode at its local API.</p><div class="code">GET /health<br>POST /v1/chat/completions</div></article>
      </section>
    </main>
    <footer><span>Open-source · Node.js 18+</span><span>Credentials stay in your local environment</span></footer>
  </div>
</body>
</html>
HTML

/usr/bin/time -p node --input-type=module -e 'import { mkdirSync, writeFileSync } from "node:fs"; const project = process.env.PROJECT_DIR; const output = `${project}/dist`; const metadata = process.env.OPENCODE_WEB_DIR || "/home/runner/work/_temp/omgithub-web"; mkdirSync(metadata, { recursive: true }); writeFileSync(`${metadata}/deployment-output.json`, JSON.stringify({ project, directory: output }));' 

cd "$PROJECT_DIR/dist"
exec env -u OPENCODE_WEB_DIR /usr/bin/time -p node "$RUNTIME_DIR/scripts/default-start.mjs"
