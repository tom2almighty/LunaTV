import {
  createCmsClient,
  createDirectStrategy,
  createFetchAdapter,
} from '@ouonnki/cms-core';

const COMMON_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const DOUBAN_BASE = 'https://m.douban.com';
const SOURCE_CACHE_TTL = 5 * 60 * 1000;

let cachedSources = null;
let cachedSourcesAt = 0;
let cachedSourcesKey = '';

function getProcessEnv() {
  return typeof process !== 'undefined' && process.env ? process.env : {};
}

function envValue(env, ...keys) {
  for (const key of keys) {
    const value = env?.[key] ?? getProcessEnv()?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function text(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(data, { ...init, headers });
}

function errorJson(message, status = 500) {
  return json({ error: message }, { status });
}


function base64UrlEncode(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmacSign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

function constantTimeEqual(a, b) {
  const left = new TextEncoder().encode(String(a));
  const right = new TextEncoder().encode(String(b));
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] || 0) ^ (right[i] || 0);
  }
  return diff === 0;
}

function getAuthConfig(env = {}) {
  const adminPassword = envValue(env, 'ADMIN_PASSWORD');
  const authSecret = envValue(env, 'AUTH_SECRET');
  const ttlRaw = envValue(env, 'AUTH_TOKEN_TTL_SECONDS');
  const ttl = Number.parseInt(ttlRaw || '', 10);
  return {
    adminPassword,
    authSecret,
    ttlSeconds: Number.isFinite(ttl) && ttl > 0 ? ttl : 7 * 24 * 60 * 60,
  };
}

async function createAuthToken(env = {}) {
  const { authSecret, ttlSeconds } = getAuthConfig(env);
  if (!authSecret) throw new Error('AUTH_SECRET 未配置');
  const payload = {
    sub: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = await hmacSign(body, authSecret);
  return `${body}.${sig}`;
}

async function verifyAuthToken(token, env = {}) {
  const { authSecret } = getAuthConfig(env);
  if (!authSecret || !token || !token.includes('.')) return false;
  const [body, sig] = token.split('.');
  if (!body || !sig) return false;
  const expected = await hmacSign(body, authSecret);
  if (!constantTimeEqual(sig, expected)) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(body));
    return payload?.sub === 'admin' && Number(payload.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function getBearerToken(request) {
  const header = request.headers.get('Authorization') || '';
  const matched = header.match(/^Bearer\s+(.+)$/i);
  if (matched?.[1]?.trim()) return matched[1].trim();
  try {
    return new URL(request.url).searchParams.get('token') || '';
  } catch {
    return '';
  }
}

async function requireAuth(request, env = {}) {
  return verifyAuthToken(getBearerToken(request), env);
}

async function handleAuthLogin(request, env = {}) {
  const { adminPassword, authSecret } = getAuthConfig(env);
  if (!adminPassword || !authSecret) return errorJson('认证未配置', 500);
  const payload = await request.json().catch(() => null);
  const password = String(payload?.password || '');
  if (!constantTimeEqual(password, adminPassword)) return errorJson('密码错误', 401);
  const token = await createAuthToken(env);
  return json({ token });
}


function getSiteConfig(env = {}) {
  const siteName = envValue(env, 'SITE_NAME') || 'vodhub';
  return { siteName };
}

async function handleSiteConfig(env = {}) {
  return json(getSiteConfig(env), { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } });
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeVideoSources(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === 'object' && s.id && s.url)
    .map((s) => ({
      id: String(s.id).trim(),
      name: String(s.name || s.id).trim(),
      url: String(s.url).trim(),
      detailUrl: s.detailUrl ? String(s.detailUrl).trim() : undefined,
      timeout: typeof s.timeout === 'number' && s.timeout > 0 ? s.timeout : undefined,
      retry: typeof s.retry === 'number' && s.retry >= 0 ? s.retry : undefined,
      isEnabled: s.isEnabled !== false,
    }))
    .filter((s) => s.id && s.url && isHttpUrl(s.url));
}

function parseConfigToSources(raw) {
  try {
    const cleaned = String(raw || '').replace(/^\s*['"`]/, '').replace(/['"`]\s*$/, '').trim();
    const data = JSON.parse(cleaned);
    return normalizeVideoSources(Array.isArray(data) ? data : [data]);
  } catch {
    return [];
  }
}

async function fetchWithTimeout(url, timeoutMs = 15000, headers = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('request timeout'), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal, headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadSources(env = {}) {
  const subscriptionUrl = envValue(env, 'CONFIG_SUBSCRIPTION_URL');
  const configFile = envValue(env, 'CONFIG_FILE');
  const cacheKey = `${subscriptionUrl}\n${configFile}`;
  const now = Date.now();
  if (cachedSources && cachedSourcesKey === cacheKey && now - cachedSourcesAt < SOURCE_CACHE_TTL) {
    return cachedSources;
  }

  let sources = [];
  if (subscriptionUrl && isHttpUrl(subscriptionUrl)) {
    try {
      const raw = await fetchWithTimeout(subscriptionUrl, 15000, {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': COMMON_UA,
      });
      sources = parseConfigToSources(raw);
    } catch (err) {
      console.error('订阅链接加载失败:', err);
    }
  }

  if (sources.length === 0 && configFile) {
    sources = parseConfigToSources(configFile);
  }

  cachedSources = sources;
  cachedSourcesAt = now;
  cachedSourcesKey = cacheKey;
  return sources;
}

function getConcurrencyLimit(env = {}) {
  const raw = envValue(env, 'SEARCH_CONCURRENCY');
  const parsed = Number.parseInt(raw || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return Math.min(20, parsed);
}

function createRuntimeCmsClient(env = {}) {
  return createCmsClient({
    requestAdapter: createFetchAdapter(),
    proxyStrategy: createDirectStrategy(),
    concurrencyLimit: getConcurrencyLimit(env),
  });
}

function normalizeYear(year) {
  if (!year) return 'unknown';
  const matched = String(year).match(/\d{4}/)?.[0];
  return matched || 'unknown';
}

function mapCmsItem(item) {
  return {
    id: String(item.vod_id || ''),
    title: String(item.vod_name || ''),
    poster: String(item.vod_pic || ''),
    source: String(item.source_code || ''),
    source_name: String(item.source_name || ''),
    year: String(item.vod_year || 'unknown'),
    episodes: [],
    episodes_titles: [],
    class: '',
    desc: String(item.vod_content || ''),
    type_name: String(item.type_name || ''),
    douban_id: item.vod_douban_id ? Number(item.vod_douban_id) : 0,
    score: item.vod_douban_score ? String(item.vod_douban_score) : '',
    actors: String(item.vod_actor || ''),
    directors: String(item.vod_director || ''),
    area: String(item.vod_area || ''),
    lang: '',
    remark: String(item.vod_remarks || ''),
  };
}

async function searchAllSources(query, env = {}) {
  const sources = (await loadSources(env)).filter((s) => s.isEnabled);
  if (!query || sources.length === 0) {
    return { items: [], totalSources: sources.length, completedSources: 0 };
  }

  const cms = createRuntimeCmsClient(env);
  let completedSources = 0;
  const unsubProgress = cms.on('search:progress', (e) => {
    completedSources = e.completed;
  });
  try {
    const rawItems = await cms.aggregatedSearch(query, sources, 1);
    return {
      items: rawItems.map(mapCmsItem),
      totalSources: sources.length,
      completedSources: sources.length,
    };
  } finally {
    unsubProgress();
  }
}

async function fetchDetailFromCms(sourceId, id, env = {}) {
  const sources = await loadSources(env);
  const source = sources.find((s) => s.id === sourceId);
  if (!source) return null;

  const cms = createRuntimeCmsClient(env);
  try {
    const detail = await cms.getDetail(id, source);
    if (!detail.success) return null;

    return {
      id,
      title: detail.videoInfo?.title || '',
      poster: detail.videoInfo?.cover || '',
      source: sourceId,
      source_name: detail.videoInfo?.source_name || source.name,
      episodes: detail.episodes || [],
      episodes_titles: detail.videoInfo?.episodes_names || [],
      year: detail.videoInfo?.year || 'unknown',
      desc: detail.videoInfo?.desc || '',
      type_name: detail.videoInfo?.type || '',
      area: detail.videoInfo?.area || '',
      actors: detail.videoInfo?.actor || '',
      directors: detail.videoInfo?.director || '',
      douban_id: 0,
      score: '',
      class: '',
      lang: '',
      remark: detail.videoInfo?.remarks || '',
    };
  } catch {
    return null;
  }
}

async function createPlaySession(payload, env = {}) {
  const mode = String(payload?.mode || '');
  const query = String(payload?.query || '').trim();
  let candidates;

  if (mode === 'group') {
    if (!Array.isArray(payload.candidates) || payload.candidates.length === 0) {
      throw new Error('缺少候选播放源');
    }
    candidates = payload.candidates.filter((item) => item.source && item.id);
  } else if (mode === 'direct') {
    const source = String(payload.source || '');
    const id = String(payload.id || '');
    if (!source || !id) throw new Error('缺少 source 或 id');

    const sources = await loadSources(env);
    const src = sources.find((s) => s.id === source);
    candidates = [{
      id,
      title: String(payload.title || ''),
      poster: String(payload.poster || ''),
      source,
      source_name: String(payload.source_name || src?.name || source),
      episodes: [],
      episodes_titles: [],
      year: normalizeYear(String(payload.year || 'unknown')),
      desc: '',
      type_name: '',
      douban_id: 0,
      score: '',
      class: '',
      actors: '',
      directors: '',
      area: '',
      lang: '',
      remark: '',
    }];
  } else if (mode === 'search') {
    const keyword = String(payload.keyword || '').trim();
    if (!keyword) throw new Error('缺少搜索关键词');
    candidates = (await searchAllSources(keyword, env)).items;
    if (candidates.length === 0) throw new Error('未找到匹配播放源');
  } else {
    throw new Error('无效的模式');
  }

  if (candidates.length === 0) throw new Error('未找到匹配播放源');

  const preferredSource = payload.preferredSource ? String(payload.preferredSource) : undefined;
  const preferredId = payload.preferredId ? String(payload.preferredId) : undefined;
  const currentSource = preferredSource && preferredId ? preferredSource : candidates[0].source;
  const currentId = preferredSource && preferredId ? preferredId : candidates[0].id;

  let detail = await fetchDetailFromCms(currentSource, currentId, env);
  if (!detail) {
    detail = candidates.find((c) => c.source === currentSource && c.id === currentId) || candidates[0];
  }

  const title = String(payload.title || detail.title || candidates[0]?.title || '').trim();
  const year = normalizeYear(String(payload.year || detail.year || 'unknown'));
  const type = detail.episodes?.length > 1 ? 'tv' : 'movie';

  return {
    detail,
    available_sources: candidates,
    search_title: query,
    current_source: currentSource,
    current_id: currentId,
    title,
    year,
    type,
  };
}

function mapDoubanItems(items = []) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    poster: item.pic?.normal || item.pic?.large || '',
    rating: item.rating?.value ? item.rating.value.toFixed(1) : '',
    year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    externalUrl: `https://movie.douban.com/subject/${item.id}`,
  }));
}

async function fetchDoubanCategory({ kind, start = '0', limit = '18', category, type }) {
  const safeKind = kind === 'tv' ? 'tv' : 'movie';
  const target = new URL(`/rexxar/api/v2/subject/recent_hot/${safeKind}`, DOUBAN_BASE);
  target.searchParams.set('start', String(start || '0'));
  target.searchParams.set('limit', String(limit || '18'));
  if (category) target.searchParams.set('category', String(category));
  if (type) target.searchParams.set('type', String(type));

  const resp = await fetch(target.toString(), {
    headers: {
      Referer: 'https://movie.douban.com/',
      'User-Agent': COMMON_UA,
      Accept: 'application/json, text/plain, */*',
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return { total: data.total || 0, items: mapDoubanItems(data.items || []) };
}

async function handleSearchStream(request, env = {}) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();
  if (!query) return errorJson('缺少搜索关键词', 400);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      try {
        const sources = (await loadSources(env)).filter((s) => s.isEnabled);
        send({ type: 'start', totalSources: sources.length });
        if (sources.length === 0) {
          send({ type: 'complete', totalResults: 0, completedSources: 0 });
          close();
          return;
        }

        const cms = createRuntimeCmsClient(env);
        const all = [];
        const unsubResult = cms.on('search:result', (e) => {
          const items = e.items.map(mapCmsItem);
          all.push(...items);
          send({
            type: 'result',
            items,
            sourceKey: e.source?.id || '',
            sourceName: e.source?.name || '',
          });
        });
        const unsubProgress = cms.on('search:progress', (e) => {
          send({ type: 'progress', completed: e.completed, total: e.total });
        });

        try {
          await cms.aggregatedSearch(query, sources, 1, request.signal);
        } finally {
          unsubResult();
          unsubProgress();
        }
        send({ type: 'complete', totalResults: all.length, completedSources: sources.length });
        close();
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : '搜索失败' });
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleImageProxy(url) {
  const target = url.searchParams.get('url') || '';
  if (!target || !isHttpUrl(target)) return text('', { status: 400 });

  try {
    const referer = target.includes('doubanio.com') ? 'https://movie.douban.com/' : new URL(target).origin;
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
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=15552000, s-maxage=15552000, immutable');
    return new Response(resp.body, { status: resp.status, headers });
  } catch {
    return text('', { status: 502 });
  }
}

export async function handleApiRequest(request, env = {}) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (path === '/api/auth/login' && request.method === 'POST') {
      return handleAuthLogin(request, env);
    }

    if (path === '/api/auth/verify' && request.method === 'GET') {
      return (await requireAuth(request, env)) ? json({ ok: true }) : errorJson('未登录或登录已过期', 401);
    }

    if (path === '/api/site-config' && request.method === 'GET') {
      return handleSiteConfig(env);
    }

    if (path.startsWith('/api/') && !(await requireAuth(request, env))) {
      return errorJson('未登录或登录已过期', 401);
    }

    if (path === '/api/search-stream' && request.method === 'GET') {
      return handleSearchStream(request, env);
    }

    if (path === '/api/search' && request.method === 'GET') {
      const q = (url.searchParams.get('q') || '').trim();
      if (!q) return errorJson('缺少搜索关键词', 400);
      return json(await searchAllSources(q, env));
    }

    if (path === '/api/detail' && request.method === 'GET') {
      const source = url.searchParams.get('source') || '';
      const id = url.searchParams.get('id') || '';
      if (!source || !id) return errorJson('缺少 source 或 id', 400);
      const detail = await fetchDetailFromCms(source, id, env);
      if (!detail) return errorJson('获取详情失败', 404);
      return json(detail);
    }

    if (path === '/api/play-session' && request.method === 'POST') {
      const payload = await request.json().catch(() => null);
      if (!payload) return errorJson('请求体格式无效', 400);
      try {
        return json(await createPlaySession(payload, env));
      } catch (err) {
        return errorJson(err instanceof Error ? err.message : '加载播放源失败', 400);
      }
    }

    if (path === '/api/recommendations' && request.method === 'GET') {
      const [moviesData, tvData, varietyData] = await Promise.all([
        fetchDoubanCategory({ kind: 'movie', start: '0', limit: '18', category: '热门', type: '全部' }),
        fetchDoubanCategory({ kind: 'tv', start: '0', limit: '18', category: 'tv', type: 'tv' }),
        fetchDoubanCategory({ kind: 'tv', start: '0', limit: '18', category: 'show', type: 'show' }),
      ]);
      return json(
        { movies: moviesData.items, tvShows: tvData.items, varietyShows: varietyData.items },
        { headers: { 'Cache-Control': 'public, max-age=604800, s-maxage=604800' } },
      );
    }

    if (path === '/api/douban/category' && request.method === 'GET') {
      const data = await fetchDoubanCategory({
        kind: url.searchParams.get('kind') || 'movie',
        start: url.searchParams.get('start') || '0',
        limit: url.searchParams.get('limit') || '18',
        category: url.searchParams.get('category') || '',
        type: url.searchParams.get('type') || '',
      });
      return json(data, { headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' } });
    }

    if (path === '/api/image' && request.method === 'GET') {
      return handleImageProxy(url);
    }

    return errorJson('Not Found', 404);
  } catch (err) {
    console.error('api error:', err);
    return errorJson(err instanceof Error ? err.message : '服务器错误', 500);
  }
}
