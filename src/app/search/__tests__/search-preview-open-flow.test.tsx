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
    default: (props: {
      testId?: string;
      title?: string;
      play_group?: unknown[];
      interactionMode?: string;
      onOpenPreview?: (payload: {
        key: string;
        title: string;
        sourceCount: number;
        onPlayNow: () => void;
      }) => void;
    }) => (
      <button
        data-testid={props.testId || 'search-card-fallback'}
        onClick={() => {
          if (
            props.interactionMode === 'preview-first' &&
            props.onOpenPreview
          ) {
            props.onOpenPreview({
              key: 'agg-0',
              title: props.title || '未命名',
              sourceCount: props.play_group?.length || 1,
              onPlayNow: () => {},
            });
          }
        }}
      >
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

vi.mock('@/hooks/useSearchVirtualGrid', () => ({
  useSearchVirtualGrid: () => ({
    virtualGridRef: { current: null },
    virtualGridColumns: 1,
    resultsVirtualizer: {
      getTotalSize: () => 1,
      getVirtualItems: () => [{ key: 'row-0', index: 0, start: 0 }],
      measureElement: () => {},
    },
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
  it('opens preview instead of routing immediately when clicking result card', async () => {
    render(<SearchPageClient />);
    fireEvent.click(await screen.findByTestId('search-card-0'));
    expect(screen.getByText('立即播放')).toBeInTheDocument();
  });
});
