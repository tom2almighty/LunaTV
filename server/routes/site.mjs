import { readEnv } from '../lib/env.mjs';

export function siteConfig(c) {
  return c.json(
    {
      siteName: readEnv(c.env, 'SITE_NAME') || 'vodhub',
      announcement: readEnv(c.env, 'SITE_ANNOUNCEMENT'),
      announcementTitle: readEnv(c.env, 'SITE_ANNOUNCEMENT_TITLE'),
    },
    200,
    { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
  );
}
