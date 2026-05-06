import { type VideoSource } from '@ouonnki/cms-core';

function normalizeVideoSources(raw: Partial<VideoSource>[]): VideoSource[] {
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
    }));
}

export function parseConfigToSources(raw: string): VideoSource[] {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return normalizeVideoSources(data);
  } catch {
    return [];
  }
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function loadSources(): Promise<VideoSource[]> {
  const subscriptionUrl = import.meta.env.VITE_CONFIG_SUBSCRIPTION_URL || '';
  if (subscriptionUrl && isHttpUrl(subscriptionUrl)) {
    try {
      const raw = await fetchWithTimeout(subscriptionUrl);
      const sources = parseConfigToSources(raw);
      if (sources.length > 0) return sources;
    } catch (err) {
      console.error('订阅链接加载失败:', err);
    }
  }

  const configFile = import.meta.env.VITE_CONFIG_FILE || '';
  if (configFile) {
    return parseConfigToSources(configFile);
  }

  return [];
}
