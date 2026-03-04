export type SearchContextSnapshot = {
  version: 1;
  query: string;
  viewMode: 'agg' | 'all';
  filterAll: {
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  };
  filterAgg: {
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  };
  scrollTop: number;
  activeKey: string | null;
};

type InputSnapshot = Omit<SearchContextSnapshot, 'version'>;

function isYearOrder(value: unknown): value is 'none' | 'asc' | 'desc' {
  return value === 'none' || value === 'asc' || value === 'desc';
}

function hasValidFilter(
  value: unknown,
): value is SearchContextSnapshot['filterAll'] {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.source === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.year === 'string' &&
    isYearOrder(candidate.yearOrder)
  );
}

export function serializeSearchContextSnapshot(
  snapshot: InputSnapshot,
): string {
  return JSON.stringify({
    version: 1,
    ...snapshot,
  } satisfies SearchContextSnapshot);
}

export function parseSearchContextSnapshot(
  raw: string,
): SearchContextSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Record<string, unknown>;

    if (candidate.version !== 1) return null;
    if (typeof candidate.query !== 'string') return null;
    if (candidate.viewMode !== 'agg' && candidate.viewMode !== 'all')
      return null;
    if (!hasValidFilter(candidate.filterAll)) return null;
    if (!hasValidFilter(candidate.filterAgg)) return null;
    if (typeof candidate.scrollTop !== 'number') return null;
    if (
      candidate.activeKey !== null &&
      typeof candidate.activeKey !== 'string'
    ) {
      return null;
    }

    return candidate as SearchContextSnapshot;
  } catch {
    return null;
  }
}
