export interface SiteConfig {
  siteName: string;
}

export async function fetchSiteConfig(): Promise<SiteConfig> {
  const resp = await fetch('/api/site-config');
  if (!resp.ok) return { siteName: 'vodhub' };
  const data = (await resp.json().catch(() => null)) as Partial<SiteConfig> | null;
  return { siteName: data?.siteName || 'vodhub' };
}
