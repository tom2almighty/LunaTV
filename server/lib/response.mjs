const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function mergeHeaders(extra = {}) {
  const headers = new Headers(extra);
  headers.set('Access-Control-Allow-Origin', '*');
  return headers;
}

export function json(data, init = {}) {
  const headers = mergeHeaders(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function text(body, init = {}) {
  return new Response(body, { ...init, headers: mergeHeaders(init.headers) });
}

export function errorJson(message, status = 500) {
  return json({ error: message }, { status });
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}
