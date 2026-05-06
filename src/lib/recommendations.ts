import type { RecommendationHomeResult, RecommendationItem } from './types';

interface DoubanResponse {
  total: number;
  items: Array<{
    id: string; title: string; card_subtitle: string;
    pic: { large: string; normal: string }; rating: { value: number };
  }>;
}

async function fetchDouban(url: string): Promise<DoubanResponse> {
  const resp = await fetch(`/api/douban/rexxar/api/v2/subject/recent_hot/${url}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function mapItems(items: DoubanResponse['items']): RecommendationItem[] {
  return items.map((item) => ({
    id: item.id, title: item.title,
    poster: item.pic?.normal || item.pic?.large || '',
    rating: item.rating?.value ? item.rating.value.toFixed(1) : '',
    year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    externalUrl: `https://movie.douban.com/subject/${item.id}`,
  }));
}

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
    const [moviesData, tvData, varietyData] = await Promise.all([
      fetchDouban('movie?start=0&limit=18&category=热门&type=全部'),
      fetchDouban('tv?start=0&limit=18&category=tv&type=tv'),
      fetchDouban('tv?start=0&limit=18&category=show&type=show'),
    ]);
    const result = { movies: mapItems(moviesData.items), tvShows: mapItems(tvData.items), varietyShows: mapItems(varietyData.items) };
    setCachedRecommendations(result);
    return result;
  } catch { return { movies: [], tvShows: [], varietyShows: [] }; }
}
