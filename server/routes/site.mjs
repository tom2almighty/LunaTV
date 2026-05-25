import { json } from '../lib/response.mjs';
import { readEnv } from '../lib/env.mjs';

export function siteConfig(_request, env) {
  return json(
    { siteName: readEnv(env, 'SITE_NAME') || 'vodhub' },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
  );
}
