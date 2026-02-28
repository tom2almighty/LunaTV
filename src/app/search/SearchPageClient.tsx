/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion,no-empty */
'use client';

import { ChevronUp, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
} from '@/lib/db';
import {
  setSearchMemoryCache,
} from '@/lib/search-memory-cache';
import { SearchResult } from '@/lib/types';
import { useBackToTopVisibility } from '@/hooks/useBackToTopVisibility';
import { useSearchExecution } from '@/hooks/useSearchExecution';
import { useSearchPageInit } from '@/hooks/useSearchPageInit';
import { SearchFilterState, useSearchResultFilters } from '@/hooks/useSearchResultFilters';
import { useSearchVirtualGrid } from '@/hooks/useSearchVirtualGrid';

import SearchResultFilter from '@/components/SearchResultFilter';
import VideoCard, { VideoCardHandle } from '@/components/VideoCard';

function SearchPageClient() {
  const MIN_SEARCH_LOADING_MS = 280;

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryRef = useRef<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const loadingStartedAtRef = useRef<number>(0);
  const loadingTimerRef = useRef<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [totalSources, setTotalSources] = useState(0);
  const [completedSources, setCompletedSources] = useState(0);
  const pendingResultsRef = useRef<SearchResult[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const [useFluidSearch, setUseFluidSearch] = useState(true);
  // 聚合卡片 refs 与聚合统计缓存
  const groupRefs = useRef<
    Map<string, React.RefObject<VideoCardHandle | null>>
  >(new Map());
  const groupStatsRef = useRef<
    Map<
      string,
      { douban_id?: number; episodes?: number; source_names: string[] }
    >
  >(new Map());

  const beginSearchLoading = useCallback(() => {
    loadingStartedAtRef.current = Date.now();
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setIsLoading(true);
  }, []);

  const endSearchLoading = useCallback(() => {
    const elapsed = Date.now() - loadingStartedAtRef.current;
    const remaining = Math.max(0, MIN_SEARCH_LOADING_MS - elapsed);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    if (remaining === 0) {
      setIsLoading(false);
      return;
    }
    loadingTimerRef.current = window.setTimeout(() => {
      setIsLoading(false);
      loadingTimerRef.current = null;
    }, remaining);
  }, []);

  const endSearchLoadingImmediately = useCallback(() => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const getGroupRef = (
    key: string,
  ): React.RefObject<VideoCardHandle | null> => {
    let ref = groupRefs.current.get(key);
    if (!ref) {
      ref = { current: null };
      groupRefs.current.set(key, ref);
    }
    return ref;
  };

  // 过滤器：非聚合与聚合
  const [filterAll, setFilterAll] = useState<SearchFilterState>({
    source: 'all',
    title: 'all',
    year: 'all',
    yearOrder: 'none',
  });
  const [filterAgg, setFilterAgg] = useState<SearchFilterState>({
    source: 'all',
    title: 'all',
    year: 'all',
    yearOrder: 'none',
  });

  // 获取默认聚合设置：只读取用户本地设置，默认为 true
  const getDefaultAggregate = () => {
    if (typeof window !== 'undefined') {
      const userSetting = localStorage.getItem('defaultAggregateSearch');
      if (userSetting !== null) {
        return JSON.parse(userSetting);
      }
    }
    return true; // 默认启用聚合
  };

  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => {
    return getDefaultAggregate() ? 'agg' : 'all';
  });

  // 在“无排序”场景用于每个源批次的预排序：完全匹配标题优先，其次年份倒序，未知年份最后
  const sortBatchForNoOrder = (items: SearchResult[]) => {
    const q = currentQueryRef.current.trim();
    return items.slice().sort((a, b) => {
      const aExact = (a.title || '').trim() === q;
      const bExact = (b.title || '').trim() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aNum = Number.parseInt(a.year as any, 10);
      const bNum = Number.parseInt(b.year as any, 10);
      const aValid = !Number.isNaN(aNum);
      const bValid = !Number.isNaN(bNum);
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      if (aValid && bValid) return bNum - aNum; // 年份倒序
      return 0;
    });
  };

  const {
    buildAggregateKey,
    computeGroupStats,
    aggregatedResults,
    aggregateGroupMap,
    filterOptions,
    filteredAllResults,
    filteredAggResults,
    currentResultCount,
  } = useSearchResultFilters({
    searchResults,
    searchQuery,
    filterAll,
    filterAgg,
    viewMode,
  });

  // 当聚合结果变化时，如果某个聚合已存在，则调用其卡片 ref 的 set 方法增量更新
  useEffect(() => {
    aggregatedResults.forEach(([mapKey, group]) => {
      const stats = computeGroupStats(group);
      const prev = groupStatsRef.current.get(mapKey);
      if (!prev) {
        // 第一次出现，记录初始值，不调用 ref（由初始 props 渲染）
        groupStatsRef.current.set(mapKey, stats);
        return;
      }
      // 对比变化并调用对应的 set 方法
      const ref = groupRefs.current.get(mapKey);
      if (ref && ref.current) {
        if (prev.episodes !== stats.episodes) {
          ref.current.setEpisodes(stats.episodes);
        }
        const prevNames = (prev.source_names || []).join('|');
        const nextNames = (stats.source_names || []).join('|');
        if (prevNames !== nextNames) {
          ref.current.setSourceNames(stats.source_names);
        }
        if (prev.douban_id !== stats.douban_id) {
          ref.current.setDoubanId(stats.douban_id);
        }
        groupStatsRef.current.set(mapKey, stats);
      }
    });
  }, [aggregatedResults]);

  const { virtualGridRef, virtualGridColumns, resultsVirtualizer } =
    useSearchVirtualGrid({
      showResults,
      currentResultCount,
      viewMode,
    });
  const showBackToTop = useBackToTopVisibility(virtualGridRef);
  const { searchHistory } = useSearchPageInit({
    hasQuery: !!searchParams.get('q'),
    setUseFluidSearch,
  });

  useSearchExecution({
    searchParams,
    useFluidSearch,
    setUseFluidSearch,
    beginSearchLoading,
    endSearchLoading,
    endSearchLoadingImmediately,
    setSearchQuery,
    setShowResults,
    setSearchResults,
    setTotalSources,
    setCompletedSources,
    viewMode,
    filterAggYearOrder: filterAgg.yearOrder,
    filterAllYearOrder: filterAll.yearOrder,
    sortBatchForNoOrder,
    addSearchHistory,
    currentQueryRef,
    eventSourceRef,
    pendingResultsRef,
    flushTimerRef,
    loadingTimerRef,
    totalSources,
  });

  useEffect(() => {
    const query = currentQueryRef.current.trim();
    if (!query || !showResults) return;
    setSearchMemoryCache(query, {
      results: searchResults,
      totalSources,
      completedSources,
    });
  }, [searchResults, totalSources, completedSources, showResults]);

  // 输入框内容变化时触发
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // 搜索表单提交时触发，处理搜索逻辑
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    // 回显搜索框
    setSearchQuery(trimmed);
    beginSearchLoading();
    setShowResults(true);

    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    // 其余由 searchParams 变化的 effect 处理
  };

  // 返回顶部功能
  const scrollToTop = () => {
    try {
      if (virtualGridRef.current) {
        virtualGridRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      // 如果平滑滚动完全失败，使用立即滚动
      if (virtualGridRef.current) {
        virtualGridRef.current.scrollTop = 0;
      }
      document.body.scrollTop = 0;
    }
  };

  return (
    <>
      <div className='mb-10 overflow-visible px-4 py-4 sm:px-10 sm:py-8'>
        {/* 搜索框 */}
        <div className='mb-8'>
          <form onSubmit={handleSearch} className='mx-auto max-w-2xl'>
            <div className='relative'>
              <Search className='text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2' />
              <input
                id='searchInput'
                type='text'
                value={searchQuery}
                onChange={handleInputChange}
                placeholder='搜索电影、电视剧...'
                autoComplete='off'
                className='bg-card text-foreground border-border placeholder:text-muted-foreground focus:border-primary focus:ring-primary h-12 w-full rounded-lg border py-3 pl-10 pr-12 text-sm shadow-sm focus:outline-none focus:ring-2'
              />

              {/* 清除按钮 */}
              {searchQuery && (
                <button
                  type='button'
                  onClick={() => {
                    setSearchQuery('');
                    document.getElementById('searchInput')?.focus();
                  }}
                  className='text-muted-foreground hover:text-foreground absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors'
                  aria-label='清除搜索内容'
                >
                  <X className='h-5 w-5' />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 搜索结果或搜索历史 */}
        <div className='mx-auto mt-12 max-w-[95%] overflow-visible'>
          {showResults ? (
            <section className='mb-12'>
              {/* 标题 */}
              <div className='mb-4'>
                <h2 className='text-foreground text-xl font-bold'>
                  搜索结果
                  {totalSources > 0 && useFluidSearch && (
                    <span className='text-muted-foreground ml-2 text-sm font-normal'>
                      {completedSources}/{totalSources}
                    </span>
                  )}
                  {isLoading && useFluidSearch && (
                    <span className='ml-2 inline-block align-middle'>
                      <span className='border-border border-t-primary inline-block h-3 w-3 animate-spin rounded-full border-2'></span>
                    </span>
                  )}
                </h2>
              </div>
              {/* 筛选器 + 聚合开关 同行 */}
              <div className='mb-8 flex items-center justify-between gap-3'>
                <div className='min-w-0 flex-1'>
                  {viewMode === 'agg' ? (
                    <SearchResultFilter
                      categories={filterOptions.categoriesAgg}
                      values={filterAgg}
                      onChange={(v) => setFilterAgg(v as any)}
                    />
                  ) : (
                    <SearchResultFilter
                      categories={filterOptions.categoriesAll}
                      values={filterAll}
                      onChange={(v) => setFilterAll(v as any)}
                    />
                  )}
                </div>
                {/* 聚合开关 */}
                <label className='flex shrink-0 cursor-pointer select-none items-center gap-2'>
                  <span className='text-foreground text-xs sm:text-sm'>
                    聚合
                  </span>
                  <div className='relative'>
                    <input
                      type='checkbox'
                      className='peer sr-only'
                      checked={viewMode === 'agg'}
                      onChange={() =>
                        setViewMode(viewMode === 'agg' ? 'all' : 'agg')
                      }
                    />
                    <div className='peer-checked:bg-primary bg-muted h-5 w-9 rounded-full transition-colors'></div>
                    <div className='bg-card absolute left-0.5 top-0.5 h-4 w-4 rounded-full transition-transform peer-checked:translate-x-4'></div>
                  </div>
                </label>
              </div>
              {searchResults.length === 0 ? (
                isLoading ? (
                  <div className='flex h-40 items-center justify-center'>
                    <div className='border-primary h-8 w-8 animate-spin rounded-full border-b-2'></div>
                  </div>
                ) : (
                  <div className='text-muted-foreground py-8 text-center'>
                    未找到相关结果
                  </div>
                )
              ) : (
                <div
                  key={`search-results-${viewMode}`}
                  ref={virtualGridRef}
                  className='max-h-[72vh] overflow-y-auto pr-1'
                >
                  <div
                    style={{
                      height: `${resultsVirtualizer.getTotalSize()}px`,
                      position: 'relative',
                      width: '100%',
                    }}
                  >
                    {resultsVirtualizer.getVirtualItems().map((virtualRow) => {
                      const startIndex = virtualRow.index * virtualGridColumns;
                      const endIndex = Math.min(
                        startIndex + virtualGridColumns,
                        currentResultCount,
                      );

                      const rowCards: React.ReactNode[] = [];

                      for (let index = startIndex; index < endIndex; index++) {
                        if (viewMode === 'agg') {
                          const [mapKey, group] = filteredAggResults[index] || [];
                          if (!mapKey || !group) continue;

                          const title = group[0]?.title || '';
                          const poster = group[0]?.poster || '';
                          const year = group[0]?.year || 'unknown';
                          const { episodes, source_names, douban_id } =
                            computeGroupStats(group);
                          const type = episodes === 1 ? 'movie' : 'tv';

                          if (!groupStatsRef.current.has(mapKey)) {
                            groupStatsRef.current.set(mapKey, {
                              episodes,
                              source_names,
                              douban_id,
                            });
                          }

                          rowCards.push(
                            <div key={`agg-${mapKey}`} className='w-full'>
                              <VideoCard
                                ref={getGroupRef(mapKey)}
                                from='search'
                                isAggregate={true}
                                play_group={group}
                                title={title}
                                poster={poster}
                                year={year}
                                episodes={episodes}
                                source_names={source_names}
                                douban_id={douban_id}
                                query={
                                  searchQuery.trim() !== title
                                    ? searchQuery.trim()
                                    : ''
                                }
                                type={type}
                              />
                            </div>,
                          );
                          continue;
                        }

                        const item = filteredAllResults[index];
                        if (!item) continue;

                        rowCards.push(
                          <div
                            key={`all-${item.source}-${item.id}`}
                            className='w-full'
                          >
                            <VideoCard
                              id={item.id}
                              title={item.title}
                              poster={item.poster}
                              episodes={item.episodes.length}
                              play_group={
                                aggregateGroupMap.get(buildAggregateKey(item)) || [
                                  item,
                                ]
                              }
                              source={item.source}
                              source_name={item.source_name}
                              douban_id={item.douban_id}
                              query={
                                searchQuery.trim() !== item.title
                                  ? searchQuery.trim()
                                  : ''
                              }
                              year={item.year}
                              from='search'
                              type={item.episodes.length > 1 ? 'tv' : 'movie'}
                            />
                          </div>,
                        );
                      }

                      return (
                        <div
                          key={virtualRow.key}
                          data-index={virtualRow.index}
                          ref={resultsVirtualizer.measureElement}
                          className='absolute left-0 top-0 grid gap-x-2 px-0 pb-14 sm:gap-x-8 sm:px-2 sm:pb-20'
                          style={{
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                            gridTemplateColumns: `repeat(${virtualGridColumns}, minmax(0, 1fr))`,
                          }}
                        >
                          {rowCards}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          ) : (
            // 搜索历史
            <section className='mb-12'>
              <h2 className='text-foreground mb-4 text-left text-xl font-bold'>
                搜索历史
                {searchHistory.length > 0 && (
                  <button
                    onClick={() => {
                      clearSearchHistory(); // 事件监听会自动更新界面
                    }}
                    className='text-muted-foreground hover:text-primary ml-3 text-sm transition-colors'
                  >
                    清空
                  </button>
                )}
              </h2>
              {searchHistory.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {searchHistory.map((item) => (
                    <div key={item} className='group relative'>
                      <button
                        onClick={() => {
                          setSearchQuery(item);
                          router.push(
                            `/search?q=${encodeURIComponent(item.trim())}`,
                          );
                        }}
                        className='bg-card text-foreground hover:bg-muted rounded-full px-4 py-2 text-sm transition-colors duration-200'
                      >
                        {item}
                      </button>
                      {/* 删除按钮 */}
                      <button
                        aria-label='删除搜索历史'
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          deleteSearchHistory(item); // 事件监听会自动更新界面
                        }}
                        className='bg-muted-foreground text-card hover:bg-destructive absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] opacity-0 transition-colors group-hover:opacity-100'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-muted-foreground py-4 text-sm'>
                  暂无搜索历史
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* 返回顶部悬浮按钮 */}
      <button
        onClick={scrollToTop}
        className={`bg-primary/90 hover:bg-primary z-500 group fixed bottom-20 right-6 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out md:bottom-6 ${
          showBackToTop
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        aria-label='返回顶部'
      >
        <ChevronUp className='h-6 w-6 transition-transform group-hover:scale-110' />
      </button>
    </>
  );
}

export default SearchPageClient;

