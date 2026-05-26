import { isHttpUrl } from '../lib/sources.mjs';

const COMMON_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export async function imageProxy(c) {
  const target = c.req.query('url') || '';
  if (!target || !isHttpUrl(target)) return c.body(null, 400);

  try {
    const referer = target.includes('doubanio.com')
      ? 'https://movie.douban.com/'
      : new URL(target).origin;
    const resp = await fetch(target, {
      headers: { Referer: referer, 'User-Agent': COMMON_UA },
    });
    const headers = new Headers();
    resp.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'content-length'].includes(lower)) return;
      if (lower.startsWith('access-control-')) return;
      headers.set(key, value);
    });
    headers.set('Cache-Control', 'public, max-age=15552000, s-maxage=15552000, immutable');
    return new Response(resp.body, { status: resp.status, headers });
  } catch {
    return c.body(null, 502);
  }
}
