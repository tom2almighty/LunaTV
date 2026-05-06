import { apiFetch } from './api-client';
import type { RecommendationHomeResult } from './types';

const CACHE_KEY = 'vodhub_recommendations';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export function getCachedRecommendations(): RecommendationHomeResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return entry.data;
  } catch { return null; }
}

export function setCachedRecommendations(data: RecommendationHomeResult): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })); } catch { /* */ }
}

export async function fetchRecommendations(): Promise<RecommendationHomeResult> {
  const cached = getCachedRecommendations();
  if (cached) return cached;
  try {
    const resp = await apiFetch('/api/recommendations');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const result = await resp.json() as RecommendationHomeResult;
    setCachedRecommendations(result);
    return result;
  } catch { return { movies: [], tvShows: [], varietyShows: [] }; }
}
