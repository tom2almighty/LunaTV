// Shared proxy handlers used by both the Vite dev middleware and the
// production Express server. ESM, no external deps.
//
// Scope:
//   /api/cms     — forwards CMS API calls (search/detail) so we can supply
//                  a real User-Agent + bypass CORS. Video streams are NOT
//                  proxied; the browser fetches m3u8/ts directly.
//   /api/image   — referer-aware image proxy (Douban posters).
//   /api/douban  — Douban API proxy (recent_hot lists).

const COMMON_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getQueryParam(req, key) {
  return new URL(req.url || '', 'http://x').searchParams.get(key);
}

function copyHeaders(srcResp, res) {
  srcResp.headers.forEach((v, k) => {
    const lk = k.toLowerCase();
    if (['content-encoding', 'transfer-encoding', 'content-length'].includes(lk)) return;
    if (lk.startsWith('access-control-')) return;
    res.setHeader(k, v);
  });
  res.setHeader('Access-Control-Allow-Origin', '*');
}

async function sendBuffer(resp, res) {
  const buf = Buffer.from(await resp.arrayBuffer());
  res.statusCode = resp.status;
  res.end(buf);
}

// /api/cms?url=<encoded> — forwards CMS API calls.
// cms-core uses createUrlPrefixProxyStrategy('/api/cms?url=') which
// URL-encodes the target. We supply User-Agent + Accept here because the
// browser strips User-Agent and many CMS backends require both.
export async function handleCmsProxy(req, res) {
  const target = getQueryParam(req, 'url');
  if (!target || !isHttpUrl(target)) {
    res.statusCode = 400;
    res.end('invalid url');
    return;
  }
  try {
    const resp = await fetch(target, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': COMMON_UA,
      },
    });
    copyHeaders(resp, res);
    await sendBuffer(resp, res);
  } catch {
    res.statusCode = 502;
    res.end('proxy error');
  }
}

// /api/image?url=<encoded> — referer-aware image proxy (Douban posters).
export async function handleImageProxy(req, res) {
  const target = getQueryParam(req, 'url');
  if (!target || !isHttpUrl(target)) {
    res.statusCode = 400;
    res.end();
    return;
  }
  try {
    const referer = target.includes('doubanio.com')
      ? 'https://movie.douban.com/'
      : new URL(target).origin;
    const resp = await fetch(target, {
      headers: { Referer: referer, 'User-Agent': COMMON_UA },
    });
    copyHeaders(resp, res);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    await sendBuffer(resp, res);
  } catch {
    res.statusCode = 502;
    res.end();
  }
}

// /api/douban/* — Douban API proxy (recent_hot lists).
export async function handleDoubanProxy(req, res) {
  try {
    const path = req.url || '';
    const target = new URL(path, 'https://m.douban.com');
    const resp = await fetch(target.toString(), {
      headers: { Referer: 'https://movie.douban.com/', 'User-Agent': COMMON_UA },
    });
    copyHeaders(resp, res);
    await sendBuffer(resp, res);
  } catch {
    res.statusCode = 502;
    res.end();
  }
}
