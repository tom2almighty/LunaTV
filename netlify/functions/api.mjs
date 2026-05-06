import { handleApiRequest } from '../../server/api-core.mjs';

function netlifyEnv() {
  const get = globalThis.Netlify?.env?.get?.bind(globalThis.Netlify.env);
  if (!get) return undefined;
  return {
    ADMIN_PASSWORD: get('ADMIN_PASSWORD') || '',
    AUTH_SECRET: get('AUTH_SECRET') || '',
    AUTH_TOKEN_TTL_SECONDS: get('AUTH_TOKEN_TTL_SECONDS') || '',
    SITE_NAME: get('SITE_NAME') || '',
    CONFIG_FILE: get('CONFIG_FILE') || '',
    CONFIG_SUBSCRIPTION_URL: get('CONFIG_SUBSCRIPTION_URL') || '',
    SEARCH_CONCURRENCY: get('SEARCH_CONCURRENCY') || '',
  };
}

export default async (request) => handleApiRequest(request, netlifyEnv());

export const config = {
  path: '/api/*',
};
