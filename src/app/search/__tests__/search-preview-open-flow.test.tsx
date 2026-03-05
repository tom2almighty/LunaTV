import { fireEvent, render, screen } from '@testing-library/react';
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

vi.mock('@/components/SearchResultFilter', () => {
  return {
    default: () => <div data-testid='search-filter' />,
  };
});

vi.mock('@/components/VideoCard', () => {
  return {
    default: (props: { testId?: string; title?: string }) => (
      <button data-testid={props.testId || 'search-card-fallback'}>
        {props.title || 'card'}
      </button>
    ),
  };
});

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
          episodes: ['ep1', 'ep2'],
          episodes_titles: ['第1集', '第2集'],
          source: 'source-a',
          source_name: '测试源A',
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

describe('search preview open flow', () => {
  it('does not show quick preview actions when clicking a result card', async () => {
    render(<SearchPageClient />);
    fireEvent.click(await screen.findByTestId('search-card-0'));
    expect(screen.queryByLabelText('快速预览')).not.toBeInTheDocument();
    expect(screen.queryByText('立即播放')).not.toBeInTheDocument();
  });
});
