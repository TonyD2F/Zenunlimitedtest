import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createGatewayServer } from '../src/server.mjs';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

test('requires a gateway key, forwards the caller key, and preserves upstream quota responses', async () => {
  const seen = [];
  const upstream = http.createServer((req, res) => {
    seen.push({ url: req.url, authorization: req.headers.authorization });
    res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '30' });
    res.end(JSON.stringify({ error: { message: 'quota reached' } }));
  });
  const upstreamUrl = await listen(upstream);
  const gateway = createGatewayServer({
    upstreamBaseUrl: `${upstreamUrl}/v1`,
    upstreamApiKey: 'provider-secret',
    upstreamAuthHeader: 'authorization',
    upstreamAuthScheme: 'Bearer',
    gatewayApiKey: 'local-secret',
  });
  const gatewayUrl = await listen(gateway);

  try {
    const denied = await fetch(`${gatewayUrl}/v1/chat/completions`, { method: 'POST' });
    assert.equal(denied.status, 401);

    const response = await fetch(`${gatewayUrl}/v1/chat/completions?x=1`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer local-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: 'test-model', messages: [] }),
    });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '30');
    assert.deepEqual(await response.json(), { error: { message: 'quota reached' } });
    assert.deepEqual(seen, [{ url: '/v1/chat/completions?x=1', authorization: 'Bearer provider-secret' }]);
  } finally {
    await close(gateway);
    await close(upstream);
  }
});

test('proxies streaming response chunks without buffering them into JSON', async () => {
  const upstream = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write('data: first\n\n');
    res.end('data: [DONE]\n\n');
  });
  const upstreamUrl = await listen(upstream);
  const gateway = createGatewayServer({
    upstreamBaseUrl: `${upstreamUrl}/v1`,
    upstreamApiKey: '',
    upstreamAuthHeader: 'authorization',
    upstreamAuthScheme: 'Bearer',
    gatewayApiKey: 'local-secret',
  });
  const gatewayUrl = await listen(gateway);

  try {
    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { authorization: 'Bearer local-secret', 'content-type': 'application/json' },
      body: JSON.stringify({ stream: true }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    assert.equal(await response.text(), 'data: first\n\ndata: [DONE]\n\n');
  } finally {
    await close(gateway);
    await close(upstream);
  }
});
