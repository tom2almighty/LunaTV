import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SearchResult } from '@/lib/types';
import {
  type SearchFilterState,
  useSearchResultFilters,
} from '@/hooks/useSearchResultFilters';

describe('useSearchResultFilters', () => {
  it('groups same title/year/type into one aggregate key', () => {
    const searchResults: SearchResult[] = [
      {
        id: 'source-a-1',
        title: 'Galactic Hunter',
        poster: '',
        episodes: ['ep1'],
        episodes_titles: ['Episode 1'],
        source: 'source-a',
        source_name: 'Source A',
        year: '2024',
      },
      {
        id: 'source-b-1',
        title: 'Galactic Hunter',
        poster: '',
        episodes: ['ep1'],
        episodes_titles: ['Episode 1'],
        source: 'source-b',
        source_name: 'Source B',
        year: '2024',
      },
    ];

    const defaultFilter: SearchFilterState = {
      source: 'all',
      title: 'all',
      year: 'all',
      yearOrder: 'none',
    };

    const { result } = renderHook(() =>
      useSearchResultFilters({
        searchResults,
        searchQuery: 'Galactic Hunter',
        filterAll: defaultFilter,
        filterAgg: defaultFilter,
        viewMode: 'agg',
      }),
    );

    const aggregatedCount = result.current.aggregatedResults.length;
    expect(aggregatedCount).toBe(1);
  });
});
