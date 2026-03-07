import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import SearchPageClient from '../SearchPageClient';

vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      back: vi.fn(),
    }),
    useSearchParams: () => ({
      get: (key: string) => (key === 'q' ? '庆余年' : null),
    }),
  };
});

vi.mock('@/components/SearchResultFilter', () => ({
  default: () => <div data-testid='search-filter' />,
}));

vi.mock('@/components/VideoCard', () => ({
  default: () => <div data-testid='search-card-0'>card</div>,
}));

vi.mock('@/hooks/useBackToTopVisibility', () => ({
  useBackToTopVisibility: () => false,
}));

vi.mock('@/hooks/useSearchPageInit', () => ({
  useSearchPageInit: () => ({
    searchHistory: [],
  }),
}));

vi.mock('@/hooks/useSearchResultFilters', () => ({
  useSearchResultFilters: ({
    searchResults,
  }: {
    searchResults: unknown[];
  }) => ({
    buildAggregateKey: () => 'agg-0',
    computeGroupStats: () => ({
      episodes: 2,
      source_names: ['测试源A', '测试源B'],
      douban_id: 1001,
    }),
    aggregatedResults: [['agg-0', searchResults]],
    aggregateGroupMap: new Map([['agg-0', searchResults]]),
    groupStatsMap: new Map([
      [
        'agg-0',
        {
          episodes: 2,
          source_names: ['测试源A', '测试源B'],
          douban_id: 1001,
        },
      ],
    ]),
    filterOptions: {
      categoriesAgg: [],
      categoriesAll: [],
    },
    filteredAllResults: searchResults,
    filteredAggResults: [['agg-0', searchResults]],
    currentResultCount: 1,
  }),
}));

vi.mock('@/hooks/useSearchExecution', () => ({
  useSearchExecution: ({
    setSearchQuery,
    setShowResults,
    setSearchResults,
    setTotalSources,
    setCompletedSources,
    endSearchLoadingImmediately,
  }: {
    setSearchQuery: (value: string) => void;
    setShowResults: (value: boolean) => void;
    setSearchResults: (value: unknown[]) => void;
    setTotalSources: (value: number) => void;
    setCompletedSources: (value: number) => void;
    endSearchLoadingImmediately: () => void;
  }) => {
    React.useEffect(() => {
      setSearchQuery('庆余年');
      setShowResults(true);
      setSearchResults([
        {
          id: 'v1',
          title: '庆余年',
          poster: '/poster.jpg',
          source: 'source-a',
          source_name: '测试源A',
          episodes: ['ep1'],
          episodes_titles: ['第1集'],
          year: '2024',
          douban_id: 1001,
        },
      ]);
      setTotalSources(1);
      setCompletedSources(1);
      endSearchLoadingImmediately();
    }, [
      endSearchLoadingImmediately,
      setCompletedSources,
      setSearchQuery,
      setSearchResults,
      setShowResults,
      setTotalSources,
    ]);
  },
}));

describe('search default view mode', () => {
  it('ignores stale local aggregate defaults and starts in aggregate mode', async () => {
    localStorage.setItem('defaultAggregateSearch', 'false');

    render(<SearchPageClient />);

    expect(await screen.findByRole('checkbox')).toBeChecked();
  });
});
