/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion,no-empty */
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUp, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db/index';
import {
  getSearchMemoryCache,
  setSearchMemoryCache,
} from '@/lib/search-memory-cache';
import { SearchResult } from '@/lib/types';

import SearchResultFilter, {
  SearchFilterCategory,
} from '@/components/SearchResultFilter';
import VideoCard, { VideoCardHandle } from '@/components/VideoCard';

function SearchPageClient() {
  const MIN_SEARCH_LOADING_MS = 280;

  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);

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
  const virtualGridRef = useRef<HTMLDivElement | null>(null);
  const [virtualGridColumns, setVirtualGridColumns] = useState(3);

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
  // 过滤器：非聚合与聚合
  const [filterAll, setFilterAll] = useState<{
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  }>({
    source: 'all',
    title: 'all',
    year: 'all',
    yearOrder: 'none',
  });
  const [filterAgg, setFilterAgg] = useState<{
    source: string;
    title: string;
    year: string;
    yearOrder: 'none' | 'asc' | 'desc';
  }>({
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

  // 简化的年份排序：unknown/空值始终在最后
  const compareYear = (
    aYear: string,
    bYear: string,
    order: 'none' | 'asc' | 'desc',
  ) => {
    // 如果是无排序状态，返回0（保持原顺序）
    if (order === 'none') return 0;

    // 处理空值和unknown
    const aIsEmpty = !aYear || aYear === 'unknown';
    const bIsEmpty = !bYear || bYear === 'unknown';

    if (aIsEmpty && bIsEmpty) return 0;
    if (aIsEmpty) return 1; // a 在后
    if (bIsEmpty) return -1; // b 在后

    // 都是有效年份，按数字比较
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

  // 聚合后的结果（按标题和年份分组）
  const aggregatedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    const keyOrder: string[] = []; // 记录键出现的顺序

    searchResults.forEach((item) => {
      // 使用 title + year + type 作为键，year 必然存在，但依然兜底 'unknown'
      const key = buildAggregateKey(item);
      const arr = map.get(key) || [];

      // 如果是新的键，记录其顺序
      if (arr.length === 0) {
        keyOrder.push(key);
      }

      arr.push(item);
      map.set(key, arr);
    });

    // 按出现顺序返回聚合结果
    return keyOrder.map(
      (key) => [key, map.get(key)!] as [string, SearchResult[]],
    );
  }, [searchResults]);

  const aggregateGroupMap = useMemo(
    () => new Map<string, SearchResult[]>(aggregatedResults),
    [aggregatedResults],
  );

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

  // 构建筛选选项
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

    // 年份: 将 unknown 放末尾
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

    const categoriesAll: SearchFilterCategory[] = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ];

    const categoriesAgg: SearchFilterCategory[] = [
      { key: 'source', label: '来源', options: sourceOptions },
      { key: 'title', label: '标题', options: titleOptions },
      { key: 'year', label: '年份', options: yearOptions },
    ];

    return { categoriesAll, categoriesAgg };
  }, [searchResults]);

  // 非聚合：应用筛选与排序
  const filteredAllResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAll;
    const filtered = searchResults.filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (title !== 'all' && item.title !== title) return false;
      if (year !== 'all' && item.year !== year) return false;
      return true;
    });

    // 如果是无排序状态，直接返回过滤后的原始顺序
    if (yearOrder === 'none') {
      return filtered;
    }

    // 简化排序：1. 年份排序，2. 年份相同时精确匹配在前，3. 标题排序
    return filtered.sort((a, b) => {
      // 首先按年份排序
      const yearComp = compareYear(a.year, b.year, yearOrder);
      if (yearComp !== 0) return yearComp;

      // 年份相同时，精确匹配在前
      const aExactMatch = a.title === searchQuery.trim();
      const bExactMatch = b.title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 最后按标题排序，正序时字母序，倒序时反字母序
      return yearOrder === 'asc'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    });
  }, [searchResults, filterAll, searchQuery]);

  // 聚合：应用筛选与排序
  const filteredAggResults = useMemo(() => {
    const { source, title, year, yearOrder } = filterAgg as any;
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

    // 如果是无排序状态，保持按关键字+年份+类型出现的原始顺序
    if (yearOrder === 'none') {
      return filtered;
    }

    // 简化排序：1. 年份排序，2. 年份相同时精确匹配在前，3. 标题排序
    return filtered.sort((a, b) => {
      // 首先按年份排序
      const aYear = a[1][0].year;
      const bYear = b[1][0].year;
      const yearComp = compareYear(aYear, bYear, yearOrder);
      if (yearComp !== 0) return yearComp;

      // 年份相同时，精确匹配在前
      const aExactMatch = a[1][0].title === searchQuery.trim();
      const bExactMatch = b[1][0].title === searchQuery.trim();
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 最后按标题排序，正序时字母序，倒序时反字母序
      const aTitle = a[1][0].title;
      const bTitle = b[1][0].title;
      return yearOrder === 'asc'
        ? aTitle.localeCompare(bTitle)
        : bTitle.localeCompare(aTitle);
    });
  }, [aggregatedResults, filterAgg, searchQuery]);

  const currentResultCount =
    viewMode === 'agg' ? filteredAggResults.length : filteredAllResults.length;
  const virtualRowCount = Math.ceil(currentResultCount / virtualGridColumns);
  const estimateRowHeight = useCallback(() => {
    const container = virtualGridRef.current;
    if (!container) return 320;

    const width = container.clientWidth;
    const isMobile = width < 640;
    const gapX = isMobile ? 8 : 32;
    const paddingX = isMobile ? 0 : 16;
    const rowGap = isMobile ? 56 : 80;
    const columns = Math.max(1, virtualGridColumns);
    const cardWidth = Math.max(
      96,
      (width - paddingX - gapX * (columns - 1)) / columns,
    );

    // 海报(2:3) + 标题/来源文案 + 行间距
    return Math.ceil(cardWidth * 1.5 + 56 + rowGap);
  }, [virtualGridColumns]);

  const resultsVirtualizer = useVirtualizer({
    count: showResults ? virtualRowCount : 0,
    getScrollElement: () => virtualGridRef.current,
    estimateSize: estimateRowHeight,
    overscan: 4,
  });

  useEffect(() => {
    if (!showResults || !virtualGridRef.current) return;

    const container = virtualGridRef.current;
    const updateColumns = () => {
      const width = container.clientWidth;
      if (width < 640) {
        setVirtualGridColumns(3);
        return;
      }
      const minCardWidth = 176;
      const gap = 32;
      const columns = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)));
      setVirtualGridColumns(columns);
    };

    updateColumns();
    const rafId = window.requestAnimationFrame(updateColumns);
    const observer = new ResizeObserver(updateColumns);
    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [showResults, viewMode, currentResultCount]);

  useEffect(() => {
    if (!showResults || currentResultCount === 0) return;
    resultsVirtualizer.measure();
  }, [showResults, currentResultCount, virtualGridColumns, resultsVirtualizer]);

  useEffect(() => {
    // 无搜索参数时聚焦搜索框
    if (!searchParams.get('q')) {
      document.getElementById('searchInput')?.focus();
    }

    // 初始加载搜索历史
    getSearchHistory().then(setSearchHistory);

    // 读取流式搜索设置
    if (typeof window !== 'undefined') {
      const savedFluidSearch = localStorage.getItem('fluidSearch');
      const defaultFluidSearch =
        (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
      if (savedFluidSearch !== null) {
        setUseFluidSearch(JSON.parse(savedFluidSearch));
      } else if (defaultFluidSearch !== undefined) {
        setUseFluidSearch(defaultFluidSearch);
      }
    }

    // 监听搜索历史更新事件
    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      },
    );

    // 获取滚动位置的函数 - 专门针对 body 滚动
    const getScrollTop = () => {
      return document.body.scrollTop || 0;
    };
    const getVirtualGridScrollTop = () => {
      return virtualGridRef.current?.scrollTop || 0;
    };

    // 使用 requestAnimationFrame 持续检测滚动位置
    let isRunning = false;
    const checkScrollPosition = () => {
      if (!isRunning) return;

      const scrollTop = getScrollTop();
      const shouldShow = scrollTop > 300 || getVirtualGridScrollTop() > 300;
      setShowBackToTop(shouldShow);

      requestAnimationFrame(checkScrollPosition);
    };

    // 启动持续检测
    isRunning = true;
    checkScrollPosition();

    // 监听 body 元素的滚动事件
    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(
        scrollTop > 300 || (virtualGridRef.current?.scrollTop || 0) > 300,
      );
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      unsubscribe();
      isRunning = false; // 停止 requestAnimationFrame 循环

      // 移除 body 滚动事件监听器
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // 当搜索参数变化时更新搜索状态
    const query = searchParams.get('q') || '';
    currentQueryRef.current = query.trim();

    if (query) {
      setSearchQuery(query);
      // 新搜索：关闭旧连接并清空结果
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch {}
        eventSourceRef.current = null;
      }
      setSearchResults([]);
      setTotalSources(0);
      setCompletedSources(0);
      // 清理缓冲
      pendingResultsRef.current = [];
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      beginSearchLoading();
      setShowResults(true);

      const trimmed = query.trim();
      const cachedEntry = getSearchMemoryCache(trimmed);
      if (cachedEntry) {
        setSearchResults(cachedEntry.results);
        setTotalSources(cachedEntry.totalSources);
        setCompletedSources(cachedEntry.completedSources);
        addSearchHistory(query);
        endSearchLoadingImmediately();
        return;
      }

      // 每次搜索时重新读取设置，确保使用最新的配置
      let currentFluidSearch = useFluidSearch;
      if (typeof window !== 'undefined') {
        const savedFluidSearch = localStorage.getItem('fluidSearch');
        if (savedFluidSearch !== null) {
          currentFluidSearch = JSON.parse(savedFluidSearch);
        } else {
          const defaultFluidSearch =
            (window as any).RUNTIME_CONFIG?.FLUID_SEARCH !== false;
          currentFluidSearch = defaultFluidSearch;
        }
      }

      // 如果读取的配置与当前状态不同，更新状态
      if (currentFluidSearch !== useFluidSearch) {
        setUseFluidSearch(currentFluidSearch);
      }

      if (currentFluidSearch) {
        // 流式搜索：打开新的流式连接
        const es = new EventSource(
          `/api/search/ws?q=${encodeURIComponent(trimmed)}`,
        );
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          if (!event.data) return;
          try {
            const payload = JSON.parse(event.data);
            if (currentQueryRef.current !== trimmed) return;
            switch (payload.type) {
              case 'start':
                setTotalSources(payload.totalSources || 0);
                setCompletedSources(0);
                break;
              case 'source_result': {
                setCompletedSources((prev) => prev + 1);
                if (
                  Array.isArray(payload.results) &&
                  payload.results.length > 0
                ) {
                  // 缓冲新增结果，节流刷入，避免频繁重渲染导致闪烁
                  const activeYearOrder =
                    viewMode === 'agg'
                      ? filterAgg.yearOrder
                      : filterAll.yearOrder;
                  const incoming: SearchResult[] =
                    activeYearOrder === 'none'
                      ? sortBatchForNoOrder(payload.results as SearchResult[])
                      : (payload.results as SearchResult[]);
                  pendingResultsRef.current.push(...incoming);
                  if (!flushTimerRef.current) {
                    flushTimerRef.current = window.setTimeout(() => {
                      const toAppend = pendingResultsRef.current;
                      pendingResultsRef.current = [];
                      startTransition(() => {
                        setSearchResults((prev) => prev.concat(toAppend));
                      });
                      flushTimerRef.current = null;
                    }, 80);
                  }
                }
                break;
              }
              case 'source_error':
                setCompletedSources((prev) => prev + 1);
                break;
              case 'complete':
                setCompletedSources(payload.completedSources || totalSources);
                // 完成前确保将缓冲写入
                if (pendingResultsRef.current.length > 0) {
                  const toAppend = pendingResultsRef.current;
                  pendingResultsRef.current = [];
                  if (flushTimerRef.current) {
                    clearTimeout(flushTimerRef.current);
                    flushTimerRef.current = null;
                  }
                  startTransition(() => {
                    setSearchResults((prev) => prev.concat(toAppend));
                  });
                }
                endSearchLoading();
                try {
                  es.close();
                } catch {}
                if (eventSourceRef.current === es) {
                  eventSourceRef.current = null;
                }
                break;
            }
          } catch {}
        };

        es.onerror = () => {
          endSearchLoading();
          // 错误时也清空缓冲
          if (pendingResultsRef.current.length > 0) {
            const toAppend = pendingResultsRef.current;
            pendingResultsRef.current = [];
            if (flushTimerRef.current) {
              clearTimeout(flushTimerRef.current);
              flushTimerRef.current = null;
            }
            startTransition(() => {
              setSearchResults((prev) => prev.concat(toAppend));
            });
          }
          try {
            es.close();
          } catch {}
          if (eventSourceRef.current === es) {
            eventSourceRef.current = null;
          }
        };
      } else {
        // 传统搜索：使用普通接口
        fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
          .then((response) => response.json())
          .then((data) => {
            if (currentQueryRef.current !== trimmed) return;

            if (data.results && Array.isArray(data.results)) {
              const activeYearOrder =
                viewMode === 'agg' ? filterAgg.yearOrder : filterAll.yearOrder;
              const results: SearchResult[] =
                activeYearOrder === 'none'
                  ? sortBatchForNoOrder(data.results as SearchResult[])
                  : (data.results as SearchResult[]);

              setSearchResults(results);
              setTotalSources(1);
              setCompletedSources(1);
            }
            endSearchLoading();
          })
          .catch(() => {
            endSearchLoading();
          });
      }
      // 保存到搜索历史 (事件监听会自动更新界面)
      addSearchHistory(query);
    } else {
      setShowResults(false);
      endSearchLoading();
    }
  }, [
    searchParams,
    beginSearchLoading,
    endSearchLoading,
    endSearchLoadingImmediately,
  ]);

  useEffect(() => {
    const query = currentQueryRef.current.trim();
    if (!query || !showResults) return;
    setSearchMemoryCache(query, {
      results: searchResults,
      totalSources,
      completedSources,
    });
  }, [searchResults, totalSources, completedSources, showResults]);

  // 组件卸载时，关闭可能存在的连接
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch {}
        eventSourceRef.current = null;
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      pendingResultsRef.current = [];
    };
  }, []);

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
          ) : searchHistory.length > 0 ? (
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
            </section>
          ) : null}
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

