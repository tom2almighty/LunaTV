import { apiFetch, apiJson } from './client';

export interface SiteConfig {
  siteName: string;
  announcement?: string;
  announcementTitle?: string;
}

export async function login(password: string): Promise<string | null> {
  const resp = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as { token?: string };
  return data.token || null;
}

export async function verify(): Promise<boolean> {
  try {
    const resp = await apiFetch('/api/auth/verify');
    return resp.ok;
  } catch {
    return false;
  }
}

export async function fetchSiteConfig(): Promise<SiteConfig> {
  try {
    const data = await apiJson<Partial<SiteConfig>>('/api/site-config');
    return {
      siteName: data?.siteName || 'vodhub',
      announcement: data?.announcement || '',
      announcementTitle: data?.announcementTitle || '',
    };
  } catch {
    return { siteName: 'vodhub', announcement: '', announcementTitle: '' };
  }
}
