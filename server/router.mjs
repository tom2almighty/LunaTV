import { errorJson, preflight } from './lib/response.mjs';
import { isAuthorized } from './lib/auth.mjs';
import * as auth from './routes/auth.mjs';
import * as site from './routes/site.mjs';
import * as search from './routes/search.mjs';
import * as detail from './routes/detail.mjs';
import * as play from './routes/play-session.mjs';
import * as douban from './routes/douban.mjs';
import * as image from './routes/image.mjs';

const PUBLIC_ROUTES = new Set([
  'POST /api/auth/login',
  'GET /api/auth/verify',
  'GET /api/site-config',
]);

const ROUTES = {
  'POST /api/auth/login': auth.login,
  'GET /api/auth/verify': auth.verify,
  'GET /api/site-config': site.siteConfig,
  'GET /api/search-stream': search.searchStream,
  'GET /api/search': search.search,
  'GET /api/detail': detail.detail,
  'POST /api/play-session': play.playSession,
  'GET /api/recommendations': douban.recommendations,
  'GET /api/douban/category': douban.category,
  'GET /api/douban/categories': douban.categories,
  'GET /api/image': image.imageProxy,
};

export async function handleApiRequest(request, env = {}) {
  if (request.method === 'OPTIONS') return preflight();

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const key = `${request.method} ${path}`;
  const handler = ROUTES[key];
  if (!handler) return errorJson('Not Found', 404);

  try {
    if (!PUBLIC_ROUTES.has(key) && !(await isAuthorized(request, env))) {
      return errorJson('未登录或登录已过期', 401);
    }
    return await handler(request, env);
  } catch (err) {
    console.error('api error:', err);
    return errorJson(err instanceof Error ? err.message : '服务器错误', 500);
  }
}
