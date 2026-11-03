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
  const gatewayApiKey = env.GATEWAY_API_KEY;
  if (!gatewayApiKey) throw new Error('GATEWAY_API_KEY is required');

  const routes = {
    'openrouter-free': {
      name: 'OpenRouter Free',
      upstreamBaseUrl: 'https://openrouter.ai/api/v1',
      upstreamModel: env.OPENROUTER_MODEL?.trim() || 'openrouter/free',
      upstreamApiKey: env.OPENROUTER_API_KEY || '',
    },
    'gemini-flash': {
      name: 'Gemini Flash',
      upstreamBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      upstreamModel: env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
      upstreamApiKey: env.GEMINI_API_KEY || '',
    },
  };

  for (const [model, route] of Object.entries(routes)) {
    const parsed = new URL(route.upstreamBaseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid upstream URL for ${model}`);
    }
  }
  if (!Object.values(routes).some(route => route.upstreamApiKey)) {
    throw new Error('Set OPENROUTER_API_KEY and/or GEMINI_API_KEY');
  }

  return {
    routes,
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
      const providers = Object.entries(config.routes || {})
        .filter(([, route]) => route.upstreamApiKey)
        .map(([model, route]) => ({ model, name: route.name, upstream: new URL(route.upstreamBaseUrl).origin }));
      const upstream = config.upstreamBaseUrl ? new URL(config.upstreamBaseUrl).origin : undefined;
      return sendJson(res, 200, { ok: true, ...(providers.length ? { providers } : { upstream }) });
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
    let bodyJson;
    try {
      body = req.method === 'POST' ? await readBody(req) : undefined;
      if (body && config.routes) bodyJson = JSON.parse(body.toString('utf8'));
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: { message: error.statusCode ? error.message : 'Request body must be valid JSON' } });
    }

    let route;
    if (config.routes) {
      if (req.method === 'GET' && requestUrl.pathname === '/v1/models') {
        const data = Object.entries(config.routes)
          .filter(([, item]) => item.upstreamApiKey)
          .map(([id, item]) => ({ id, object: 'model', name: item.name, owned_by: 'local-gateway' }));
        return sendJson(res, 200, { object: 'list', data });
      }
      const requestedModel = bodyJson?.model;
      route = config.routes[requestedModel];
      if (!route) {
        return sendJson(res, 400, { error: { message: 'Unknown model. Choose openrouter-free or gemini-flash.' } });
      }
      if (!route.upstreamApiKey) {
        return sendJson(res, 503, { error: { message: `Set the API key for ${route.name} in opencode-gateway/.env.` } });
      }
      bodyJson.model = route.upstreamModel;
      body = Buffer.from(JSON.stringify(bodyJson));
    } else {
      route = config;
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
    if (route.upstreamApiKey) {
      const authScheme = route.upstreamAuthScheme ?? (config.routes ? 'Bearer' : undefined);
      const authValue = authScheme
        ? `${authScheme} ${route.upstreamApiKey}`
        : route.upstreamApiKey;
      headers.set(route.upstreamAuthHeader || 'authorization', authValue);
    }

    try {
      const upstream = await fetch(upstreamUrl(route.upstreamBaseUrl, req.url || '/'), {
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
    } catch {
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
      console.log('Configured providers: OpenRouter and Gemini (requests use their own keys and quotas)');
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
