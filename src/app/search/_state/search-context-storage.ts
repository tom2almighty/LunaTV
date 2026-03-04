import {
  parseSearchContextSnapshot,
  SearchContextSnapshot,
  serializeSearchContextSnapshot,
} from '@/app/search/_state/search-context-snapshot';

export const SEARCH_CONTEXT_STORAGE_KEY = 'search-context-v1';

type SearchContextStorageInput = {
  query: string;
  viewMode: 'agg' | 'all';
  filterAll?: SearchContextSnapshot['filterAll'];
  filterAgg?: SearchContextSnapshot['filterAgg'];
  scrollTop?: number;
  activeKey?: string | null;
};

const DEFAULT_FILTER_ALL: SearchContextSnapshot['filterAll'] = {
  source: 'all',
  title: 'all',
  year: 'all',
  yearOrder: 'none',
};

const DEFAULT_FILTER_AGG: SearchContextSnapshot['filterAgg'] = {
  source: 'all',
  title: 'all',
  year: 'all',
  yearOrder: 'desc',
};

function isSessionStorageAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof window.sessionStorage !== 'undefined'
  );
}

export function saveSearchContext(input: SearchContextStorageInput) {
  if (!isSessionStorageAvailable()) return;

  const serialized = serializeSearchContextSnapshot({
    query: input.query,
    viewMode: input.viewMode,
    filterAll: input.filterAll || DEFAULT_FILTER_ALL,
    filterAgg: input.filterAgg || DEFAULT_FILTER_AGG,
    scrollTop: input.scrollTop ?? 0,
    activeKey: input.activeKey ?? null,
  });

  try {
    sessionStorage.setItem(SEARCH_CONTEXT_STORAGE_KEY, serialized);
  } catch {
    // ignore quota or private mode errors
  }
}

export function loadSearchContext(): SearchContextSnapshot | null {
  if (!isSessionStorageAvailable()) return null;

  try {
    const raw = sessionStorage.getItem(SEARCH_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    return parseSearchContextSnapshot(raw);
  } catch {
    return null;
  }
}

export function clearSearchContext() {
  if (!isSessionStorageAvailable()) return;

  try {
    sessionStorage.removeItem(SEARCH_CONTEXT_STORAGE_KEY);
  } catch {
    // ignore storage access errors
  }
}
