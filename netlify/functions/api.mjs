import { handleApiRequest } from '../../server/router.mjs';

const KEYS = [
  'ADMIN_PASSWORD',
  'AUTH_SECRET',
  'AUTH_TOKEN_TTL',
  'SITE_NAME',
  'SOURCES_JSON',
  'SOURCES_URL',
  'SEARCH_CONCURRENCY',
];

function netlifyEnv() {
  const get = globalThis.Netlify?.env?.get?.bind(globalThis.Netlify.env);
  if (!get) return undefined;
  const env = {};
  for (const key of KEYS) env[key] = get(key) || '';
  return env;
}

export default async (request) => handleApiRequest(request, netlifyEnv());

export const config = { path: '/api/*' };
