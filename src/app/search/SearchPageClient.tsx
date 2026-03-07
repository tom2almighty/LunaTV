/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion,no-empty */
'use client';

import { ChevronUp, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
} from '@/lib/db';
import { setSearchMemoryCache } from '@/lib/search-memory-cache';
import { SearchResult } from '@/lib/types';
import { useBackToTopVisibility } from '@/hooks/useBackToTopVisibility';
import { useSearchExecution } from '@/hooks/useSearchExecution';
import { useSearchPageInit } from '@/hooks/useSearchPageInit';
import {
  SearchFilterState,
  useSearchResultFilters,
} from '@/hooks/useSearchResultFilters';

import SearchResultFilter from '@/components/SearchResultFilter';
import VideoCard, { VideoCardHandle } from '@/components/VideoCard';

import {
  clearSearchContext,
  loadSearchContext,
  saveSearchContext,
} from '@/app/search/_state/search-context-storage';

function SearchPageClient() {
  const MIN_SEARCH_LOADING_MS = 120;
  const loadingSkeletonItems = Array.from({ length: 12 }, (_, index) => index);

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryRef = useRef<string>('');
  const searchRunTokenRef = useRef(0);
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
  const virtualGridRef = useRef<HTMLDivElement | null>(null);
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

  const [viewMode, setViewMode] = useState<'agg' | 'all'>('agg');
  const hasRestoredContextRef = useRef(false);

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
    groupStatsMap,
    filterOptions,
    filteredAllResults,
    filteredAggResults,
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
      const stats = groupStatsMap.get(mapKey) || computeGroupStats(group);
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
  }, [aggregatedResults, computeGroupStats, groupStatsMap]);

  const showBackToTop = useBackToTopVisibility(virtualGridRef);
  const { searchHistory } = useSearchPageInit({
    hasQuery: !!searchParams.get('q'),
    setUseFluidSearch,
  });
  const restoreFlag = searchParams.get('restore');
  const queryFromParams = searchParams.get('q') || '';

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
    searchRunTokenRef,
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

  const persistSearchContext = useCallback(
    (activeKey: string | null) => {
      const query = (currentQueryRef.current || searchQuery).trim();
      if (!query) return;

      const grid = virtualGridRef.current as { scrollTop?: number } | null;
      const scrollTop =
        typeof grid?.scrollTop === 'number' ? grid.scrollTop : 0;

      saveSearchContext({
        query,
        viewMode,
        filterAll,
        filterAgg,
        scrollTop,
        activeKey,
      });
    },
    [filterAgg, filterAll, searchQuery, viewMode, virtualGridRef],
  );

  useEffect(() => {
    if (restoreFlag !== '1' || hasRestoredContextRef.current || !showResults) {
      return;
    }

    const snapshot = loadSearchContext();
    if (!snapshot) return;

    const expectedQuery = (
      queryFromParams ||
      currentQueryRef.current ||
      searchQuery
    ).trim();
    if (!expectedQuery || snapshot.query.trim() !== expectedQuery) {
      return;
    }

    hasRestoredContextRef.current = true;
    setViewMode(snapshot.viewMode);
    setFilterAll(snapshot.filterAll);
    setFilterAgg(snapshot.filterAgg);
    clearSearchContext();

    const tryRestoreScroll = () => {
      const grid = virtualGridRef.current as {
        scrollTo?: (options: { top: number; behavior: ScrollBehavior }) => void;
        scrollTop?: number;
      } | null;
      if (!grid) return false;
      if (typeof grid.scrollTo === 'function') {
        grid.scrollTo({ top: snapshot.scrollTop, behavior: 'auto' });
        if (typeof grid.scrollTop === 'number') {
          grid.scrollTop = snapshot.scrollTop;
        }
        return true;
      }
      if (typeof grid.scrollTop === 'number') {
        grid.scrollTop = snapshot.scrollTop;
        return true;
      }
      return false;
    };

    window.setTimeout(() => {
      tryRestoreScroll();
    }, 0);
  }, [queryFromParams, restoreFlag, searchQuery, showResults, virtualGridRef]);

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
      <div className='app-page mb-10 overflow-visible'>
        {/* 搜索框 */}
        <div className='mb-8'>
          <form
            onSubmit={handleSearch}
            className='app-panel mx-auto max-w-3xl rounded-[1.75rem] p-3 sm:p-4'
          >
            <div className='relative'>
              <Search className='text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2' />
              <input
                id='searchInput'
                type='text'
                value={searchQuery}
                onChange={handleInputChange}
                placeholder='搜索电影、电视剧...'
                autoComplete='off'
                className='app-control text-foreground placeholder:text-muted-foreground focus:border-(--accent) h-14 w-full rounded-2xl border py-3 pl-11 pr-12 text-sm shadow-none outline-none transition-colors focus:ring-0'
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
        <div className='mt-8 overflow-visible'>
          {showResults ? (
            <section className='mb-12'>
              {/* 标题 */}
              <div className='mb-4'>
                <h2 className='app-section-title text-foreground text-xl font-semibold tracking-[0.08em] sm:text-2xl'>
                  搜索结果
                  {totalSources > 0 && useFluidSearch && (
                    <span className='text-muted-foreground ml-2 text-sm font-normal'>
                      {completedSources}/{totalSources}
                    </span>
                  )}
                  {isLoading && useFluidSearch && (
                    <span className='ml-2 inline-block align-middle'>
                      <span className='border-t-(--accent) inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20'></span>
                    </span>
                  )}
                </h2>
              </div>
              {/* 筛选器 + 聚合开关 同行 */}
              <div className='app-panel mb-8 flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between'>
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
                    <div className='peer-checked:bg-(--accent)/55 h-5 w-9 rounded-full bg-white/10 transition-colors'></div>
                    <div className='absolute left-0.5 top-0.5 h-4 w-4 rounded-full border border-white/10 bg-white transition-transform peer-checked:translate-x-4'></div>
                  </div>
                </label>
              </div>
              {searchResults.length === 0 ? (
                isLoading ? (
                  <div className='grid grid-cols-3 gap-x-2 gap-y-14 px-0 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2'>
                    {loadingSkeletonItems.map((item) => (
                      <div key={item} className='w-full animate-pulse'>
                        <div className='app-control aspect-2/3 w-full rounded-[1.25rem]' />
                        <div className='mt-2 space-y-2'>
                          <div className='app-control h-4 w-4/5 rounded-full' />
                          <div className='app-control h-3 w-2/5 rounded-full' />
                        </div>
                      </div>
                    ))}
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
                  data-testid='search-results-scroll-container'
                  className='max-h-[72vh] overflow-y-auto pr-1'
                >
                  <div className='grid grid-cols-3 gap-x-2 gap-y-14 px-0 pb-14 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2 sm:pb-20'>
                    {viewMode === 'agg'
                      ? filteredAggResults.map(([mapKey, group], index) => {
                          if (!mapKey || !group) return null;

                          const title = group[0]?.title || '';
                          const poster = group[0]?.poster || '';
                          const year = group[0]?.year || 'unknown';
                          const { episodes, source_names, douban_id } =
                            groupStatsMap.get(mapKey) ||
                            computeGroupStats(group);
                          const type = episodes === 1 ? 'movie' : 'tv';

                          if (!groupStatsRef.current.has(mapKey)) {
                            groupStatsRef.current.set(mapKey, {
                              episodes,
                              source_names,
                              douban_id,
                            });
                          }

                          return (
                            <div key={`agg-${mapKey}`} className='w-full'>
                              <VideoCard
                                ref={getGroupRef(mapKey)}
                                from='search'
                                testId={`search-card-${index}`}
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
                                onBeforePlayNavigate={() =>
                                  persistSearchContext(`agg-${mapKey}`)
                                }
                              />
                            </div>
                          );
                        })
                      : filteredAllResults.map((item, index) => {
                          if (!item) return null;

                          return (
                            <div
                              key={`all-${item.source}-${item.id}`}
                              className='w-full'
                            >
                              <VideoCard
                                testId={`search-card-${index}`}
                                id={item.id}
                                title={item.title}
                                poster={item.poster}
                                episodes={item.episodes.length}
                                play_group={
                                  aggregateGroupMap.get(
                                    buildAggregateKey(item),
                                  ) || [item]
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
                                onBeforePlayNavigate={() =>
                                  persistSearchContext(
                                    `all-${item.source}-${item.id}`,
                                  )
                                }
                              />
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
                    className='text-muted-foreground hover:text-(--accent) ml-3 text-sm transition-colors'
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
                        className='app-control text-foreground rounded-full px-4 py-2 text-sm transition-colors duration-200 hover:bg-white/10'
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
                        className='hover:bg-destructive absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/85 text-[10px] text-black opacity-0 transition-colors hover:text-white group-hover:opacity-100'
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
