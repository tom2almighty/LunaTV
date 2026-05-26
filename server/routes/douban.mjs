const COMMON_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const DOUBAN_BASE = 'https://m.douban.com';

const MOVIE_TYPES = {
  全部: { kind: 'movie', category: '热门', type: '全部' },
  华语: { kind: 'movie', category: '热门', type: '华语' },
  欧美: { kind: 'movie', category: '热门', type: '欧美' },
  韩国: { kind: 'movie', category: '热门', type: '韩国' },
  日本: { kind: 'movie', category: '热门', type: '日本' },
};

const TV_TYPES = {
  综合: { kind: 'tv', category: 'tv', type: 'tv' },
  国产剧: { kind: 'tv', category: 'tv', type: 'tv_domestic' },
  欧美剧: { kind: 'tv', category: 'tv', type: 'tv_american' },
  日剧: { kind: 'tv', category: 'tv', type: 'tv_japanese' },
  韩剧: { kind: 'tv', category: 'tv', type: 'tv_korean' },
  动画: { kind: 'tv', category: 'tv', type: 'tv_animation' },
  纪录片: { kind: 'tv', category: 'tv', type: 'tv_documentary' },
};

const SHOW_TYPES = {
  综合: { kind: 'tv', category: 'show', type: 'show' },
  国内: { kind: 'tv', category: 'show', type: 'show_domestic' },
  国外: { kind: 'tv', category: 'show', type: 'show_foreign' },
};

const REGISTRY = {
  movie: { default: '全部', types: MOVIE_TYPES },
  tv: { default: '综合', types: TV_TYPES },
  show: { default: '综合', types: SHOW_TYPES },
};

function mapItems(items = []) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    poster: item.pic?.normal || item.pic?.large || '',
    rating: item.rating?.value ? item.rating.value.toFixed(1) : '',
    year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    externalUrl: `https://movie.douban.com/subject/${item.id}`,
  }));
}

async function fetchHot({ kind, category, type, start, limit }) {
  const url = new URL(`/rexxar/api/v2/subject/recent_hot/${kind}`, DOUBAN_BASE);
  url.searchParams.set('start', String(start || '0'));
  url.searchParams.set('limit', String(limit || '18'));
  if (category) url.searchParams.set('category', category);
  if (type) url.searchParams.set('type', type);

  const resp = await fetch(url.toString(), {
    headers: {
      Referer: 'https://movie.douban.com/',
      'User-Agent': COMMON_UA,
      Accept: 'application/json, text/plain, */*',
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return { total: data.total || 0, items: mapItems(data.items || []) };
}

export async function recommendations(c) {
  const [movies, tv, show] = await Promise.all([
    fetchHot({ ...MOVIE_TYPES.全部, limit: 18 }),
    fetchHot({ ...TV_TYPES.综合, limit: 18 }),
    fetchHot({ ...SHOW_TYPES.综合, limit: 18 }),
  ]);
  return c.json(
    { movies: movies.items, tvShows: tv.items, varietyShows: show.items },
    200,
    { 'Cache-Control': 'public, max-age=604800, s-maxage=604800' },
  );
}

export async function category(c) {
  const kindParam = c.req.query('kind') || 'movie';
  const typeParam = c.req.query('type') || '';
  const registry = REGISTRY[kindParam];
  if (!registry) return c.json({ error: '无效的 kind' }, 400);

  const typeKey = registry.types[typeParam] ? typeParam : registry.default;
  const spec = registry.types[typeKey];
  const start = c.req.query('start') || '0';
  const limit = c.req.query('limit') || '18';

  const data = await fetchHot({ ...spec, start, limit });
  return c.json(data, 200, {
    'Cache-Control': 'public, max-age=1800, s-maxage=1800',
  });
}

export function categories(c) {
  return c.json(
    {
      movie: Object.keys(MOVIE_TYPES),
      tv: Object.keys(TV_TYPES),
      show: Object.keys(SHOW_TYPES),
    },
    200,
    { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
  );
}
