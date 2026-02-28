'use client';

import { useMemo } from 'react';

import { SearchResult } from '@/lib/types';

import type { SearchFilterCategory } from '@/components/SearchResultFilter';

export type SearchFilterState = {
  source: string;
  title: string;
  year: string;
  yearOrder: 'none' | 'asc' | 'desc';
};

type UseSearchResultFiltersParams = {
  searchResults: SearchResult[];
  searchQuery: string;
  filterAll: SearchFilterState;
  filterAgg: SearchFilterState;
  viewMode: 'agg' | 'all';
};

export function useSearchResultFilters({
  searchResults,
  searchQuery,
  filterAll,
  filterAgg,
  viewMode,
}: UseSearchResultFiltersParams) {
  const compareYear = (
    aYear: string,
    bYear: string,
    order: 'none' | 'asc' | 'desc',
  ) => {
    if (order === 'none') return 0;

    const aIsEmpty = !aYear || aYear === 'unknown';
    const bIsEmpty = !bYear || bYear === 'unknown';

    if (aIsEmpty && bIsEmpty) return 0;
    if (aIsEmpty) return 1;
    if (bIsEmpty) return -1;

    const aNum = parseInt(aYear, 10);
    const bNum = parseInt(bYear, 10);
    return order === 'asc' ? aNum - bNum : bNum - aNum;
  };

  const buildAggregateKey = (item: SearchResult) => {
    const normalizedTitle = (item.title || '').replaceAll(' ', '');
    const normalizedYear = item.year || 'unknown';
    const normalizedType = item.episodes.length === 1 ? 'movie' : 'tv';
    return `${normalizedTitle}-${normalizedYear}-${normalizedType}`;
  };

  const computeGroupStats = (group: SearchResult[]) => {
    const episodes = (() => {
      const countMap = new Map<number, number>();
      group.forEach((g) => {
        const len = g.episodes?.length || 0;
        if (len > 0) countMap.set(len, (countMap.get(len) || 0) + 1);
      });
      let max = 0;
      let res = 0;
      countMap.forEach((v, k) => {
        if (v > max) {
          max = v;
          res = k;
        }
      });
      return res;
    })();

    const source_names = Array.from(
      new Set(group.map((g) => g.source_name).filter(Boolean)),
    ) as string[];

    const douban_id = (() => {
      const countMap = new Map<number, number>();
      group.forEach((g) => {
        if (g.douban_id && g.douban_id > 0) {
          countMap.set(g.douban_id, (countMap.get(g.douban_id) || 0) + 1);
        }
      });
      let max = 0;
      let res: number | undefined;
      countMap.forEach((v, k) => {
        if (v > max) {
          max = v;
          res = k;
        }
      });
      return res;
    })();

    return { episodes, source_names, douban_id };
  };

  const aggregatedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    const keyOrder: string[] = [];

    searchResults.forEach((item) => {
      const key = buildAggregateKey(item);
      const arr = map.get(key) || [];
      if (arr.length === 0) {
        keyOrder.push(key);
      }
      arr.push(item);
      map.set(key, arr);
    });

    return keyOrder.map(
      (key) => [key, map.get(key)!] as [string, SearchResult[]],
    );
  }, [searchResults]);

  const aggregateGroupMap = useMemo(
    () => new Map<string, SearchResult[]>(aggregatedResults),
    [aggregatedResults],
  );

  const filterOptions = useMemo(() => {
    const sourcesSet = new Map<string, string>();
    const titlesSet = new Set<string>();
    const yearsSet = new Set<string>();

    searchResults.forEach((item) => {
      if (item.source && item.source_name) {
        sourcesSet.set(item.source, item.source_name);
      }
      if (item.title) titlesSet.add(item.title);
      if (item.year) yearsSet.add(item.year);
    });

    const sourceOptions: { label: string; value: string }[] = [
      { label: '全部来源', value: 'all' },
      ...Array.from(sourcesSet.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ label, value })),
    ];

    const titleOptions: { label: string; value: string }[] = [
      { label: '全部标题', value: 'all' },
      ...Array.from(titlesSet.values())
        .sort((a, b) => a.localeCompare(b))
        .map((t) => ({ label: t, value: t })),
    ];

    const years = Array.from(yearsSet.values());
    const knownYears = years
      .filter((y) => y !== 'unknown')
      .sort((a, b) => parseInt(b) - parseInt(a));
    const hasUnknown = years.includes('unknown');

    const yearOptions: { label: string; value: string }[] = [
      { label: '全部年份', value: 'all' },
      ...knownYears.map((y) => ({ label: y, value: y })),
      ...(hasUnknown ? [{ label: '未知', value: 'unknown' }] : []),
    ];

    const categories: SearchFilterCategory[] = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ];

    return { categoriesAll: categories, categoriesAgg: categories };
  }, [searchResults]);

  const filteredAllResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAll;
    const filtered = searchResults.filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (title !== 'all' && item.title !== title) return false;
      if (year !== 'all' && item.year !== year) return false;
      return true;
    });

    if (yearOrder === 'none') {
      return filtered;
    }

    return filtered.sort((a, b) => {
      const yearComp = compareYear(a.year, b.year, yearOrder);
      if (yearComp !== 0) return yearComp;

      const aExactMatch = a.title === searchQuery.trim();
      const bExactMatch = b.title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      return yearOrder === 'asc'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    });
  }, [searchResults, filterAll, searchQuery]);

  const filteredAggResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAgg;
    const filtered = aggregatedResults.filter(([_, group]) => {
      const gTitle = group[0]?.title ?? '';
      const gYear = group[0]?.year ?? 'unknown';
      const hasSource =
        source === 'all' ? true : group.some((item) => item.source === source);
      if (!hasSource) return false;
      if (title !== 'all' && gTitle !== title) return false;
      if (year !== 'all' && gYear !== year) return false;
      return true;
    });

    if (yearOrder === 'none') {
      return filtered;
    }

    return filtered.sort((a, b) => {
      const aYear = a[1][0].year;
      const bYear = b[1][0].year;
      const yearComp = compareYear(aYear, bYear, yearOrder);
      if (yearComp !== 0) return yearComp;

      const aExactMatch = a[1][0].title === searchQuery.trim();
      const bExactMatch = b[1][0].title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      const aTitle = a[1][0].title;
      const bTitle = b[1][0].title;
      return yearOrder === 'asc'
        ? aTitle.localeCompare(bTitle)
        : bTitle.localeCompare(aTitle);
    });
  }, [aggregatedResults, filterAgg, searchQuery]);

  const currentResultCount =
    viewMode === 'agg' ? filteredAggResults.length : filteredAllResults.length;

  return {
    buildAggregateKey,
    computeGroupStats,
    aggregatedResults,
    aggregateGroupMap,
    filterOptions,
    filteredAllResults,
    filteredAggResults,
    currentResultCount,
  };
}
