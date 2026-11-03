import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const MAX_BODY_BYTES = 64 * 1024 * 1024;
const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-type',
  'date',
  'retry-after',
  'vary',
  'www-authenticate',
  'x-request-id',
  'openai-organization',
  'openai-processing-ms',
  'openai-version',
];

function readConfig(env = process.env) {
  const upstreamBaseUrl = env.UPSTREAM_BASE_URL?.trim();
  const gatewayApiKey = env.GATEWAY_API_KEY;
  if (!upstreamBaseUrl) throw new Error('UPSTREAM_BASE_URL is required');
  if (!gatewayApiKey) throw new Error('GATEWAY_API_KEY is required');

  let parsed;
  try {
    parsed = new URL(upstreamBaseUrl);
  } catch {
    throw new Error('UPSTREAM_BASE_URL must be an absolute HTTP(S) URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('UPSTREAM_BASE_URL must use HTTP or HTTPS');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('UPSTREAM_BASE_URL must not contain credentials, query, or fragment');
  }

  const basePath = parsed.pathname.replace(/\/+$/, '');
  return {
    upstreamBaseUrl: `${parsed.origin}${basePath}`,
    upstreamApiKey: env.UPSTREAM_API_KEY || '',
    upstreamAuthHeader: env.UPSTREAM_AUTH_HEADER || 'authorization',
    upstreamAuthScheme: env.UPSTREAM_AUTH_SCHEME ?? 'Bearer',
    gatewayApiKey,
    bind: env.BIND || '127.0.0.1',
    port: Number(env.PORT || 8787),
  };
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function requestToken(req) {
  const value = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1] || '';
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body exceeds 64 MiB limit');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function sendJson(res, status, value) {
  if (res.destroyed) return;
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function upstreamUrl(base, requestUrl) {
  const incoming = new URL(requestUrl, 'http://localhost');
  const suffix = incoming.pathname.slice('/v1'.length);
  return `${base}${suffix}${incoming.search}`;
}

export function createGatewayServer(config) {
  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'GET' && requestUrl.pathname === '/health') {
      return sendJson(res, 200, { ok: true, upstream: new URL(config.upstreamBaseUrl).origin });
    }

    if (req.method === 'OPTIONS' && requestUrl.pathname.startsWith('/v1/')) {
      res.writeHead(204, { allow: 'GET, POST, OPTIONS' });
      return res.end();
    }

    if (!requestUrl.pathname.startsWith('/v1/')) {
      return sendJson(res, 404, { error: { message: 'Not found' } });
    }
    if (!['GET', 'POST'].includes(req.method || '')) {
      res.setHeader('allow', 'GET, POST, OPTIONS');
      return sendJson(res, 405, { error: { message: 'Method not allowed' } });
    }
    if (!safeEqual(requestToken(req), config.gatewayApiKey)) {
      return sendJson(res, 401, { error: { message: 'Invalid gateway API key' } });
    }

    let body;
    try {
      body = req.method === 'POST' ? await readBody(req) : undefined;
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: { message: error.message } });
    }

    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    req.on('aborted', () => controller.abort());

    const headers = new Headers();
    for (const name of ['content-type', 'accept']) {
      const value = req.headers[name];
      if (value) headers.set(name, value);
    }
    if (config.upstreamApiKey) {
      const authValue = config.upstreamAuthScheme
        ? `${config.upstreamAuthScheme} ${config.upstreamApiKey}`
        : config.upstreamApiKey;
      headers.set(config.upstreamAuthHeader, authValue);
    }

    try {
      const upstream = await fetch(upstreamUrl(config.upstreamBaseUrl, req.url || '/'), {
        method: req.method,
        headers,
        body,
        signal: controller.signal,
      });

      const responseHeaders = {};
      for (const name of FORWARDED_RESPONSE_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders[name] = value;
      }
      if (upstream.status >= 200 && upstream.status < 300 && req.url?.includes('chat/completions')) {
        responseHeaders['cache-control'] ||= 'no-cache';
      }
      res.writeHead(upstream.status, responseHeaders);
      if (!upstream.body) return res.end();
      for await (const chunk of upstream.body) {
        if (!res.write(chunk)) await new Promise(resolve => res.once('drain', resolve));
      }
      res.end();
    } catch (error) {
      if (res.destroyed || controller.signal.aborted) return;
      sendJson(res, 502, { error: { message: 'Upstream request failed' } });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = readConfig();
    const server = createGatewayServer(config);
    server.listen(config.port, config.bind, () => {
      console.log(`OpenCode local gateway listening at http://${config.bind}:${config.port}`);
      console.log(`Forwarding to ${config.upstreamBaseUrl} (credentials and quotas are not modified)`);
    });
    server.on('error', error => {
      console.error(`Gateway server error: ${error.message}`);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(`Configuration error: ${error.message}`);
    process.exitCode = 1;
  }
}
