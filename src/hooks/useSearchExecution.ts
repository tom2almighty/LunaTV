/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import {
  type Dispatch,
  type SetStateAction,
  startTransition,
  useEffect,
} from 'react';

import { getSearchMemoryCache } from '@/lib/search-memory-cache';
import { SearchResult } from '@/lib/types';

type SearchParamsLike = {
  get: (key: string) => string | null;
};

type YearOrder = 'none' | 'asc' | 'desc';
type ViewMode = 'agg' | 'all';
type RefValue<T> = { current: T };

type UseSearchExecutionParams = {
  searchParams: SearchParamsLike;
  useFluidSearch: boolean;
  setUseFluidSearch: Dispatch<SetStateAction<boolean>>;
  beginSearchLoading: () => void;
  endSearchLoading: () => void;
  endSearchLoadingImmediately: () => void;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setShowResults: Dispatch<SetStateAction<boolean>>;
  setSearchResults: Dispatch<SetStateAction<SearchResult[]>>;
  setTotalSources: Dispatch<SetStateAction<number>>;
  setCompletedSources: Dispatch<SetStateAction<number>>;
  viewMode: ViewMode;
  filterAggYearOrder: YearOrder;
  filterAllYearOrder: YearOrder;
  sortBatchForNoOrder: (items: SearchResult[]) => SearchResult[];
  addSearchHistory: (keyword: string) => void | Promise<void>;
  currentQueryRef: RefValue<string>;
  searchRunTokenRef: RefValue<number>;
  eventSourceRef: RefValue<EventSource | null>;
  pendingResultsRef: RefValue<SearchResult[]>;
  flushTimerRef: RefValue<number | null>;
  loadingTimerRef: RefValue<number | null>;
  totalSources: number;
};

function getRuntimeFluidSearchEnabled(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  const runtimeConfig = (
    window as Window & { RUNTIME_CONFIG?: { FLUID_SEARCH?: boolean } }
  ).RUNTIME_CONFIG;

  return runtimeConfig?.FLUID_SEARCH !== false;
}

export function useSearchExecution({
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
  filterAggYearOrder,
  filterAllYearOrder,
  sortBatchForNoOrder,
  addSearchHistory,
  currentQueryRef,
  searchRunTokenRef,
  eventSourceRef,
  pendingResultsRef,
  flushTimerRef,
  loadingTimerRef,
  totalSources,
}: UseSearchExecutionParams) {
  const isStalePayload = (expectedQuery: string, payloadRunToken: number) =>
    isStaleSearchPayload({
      currentQuery: currentQueryRef.current,
      expectedQuery,
      currentRunToken: searchRunTokenRef.current,
      payloadRunToken,
    });

  useEffect(() => {
    // 当搜索参数变化时更新搜索状态
    const query = searchParams.get('q') || '';
    currentQueryRef.current = query.trim();

    if (query) {
      const runToken = searchRunTokenRef.current + 1;
      searchRunTokenRef.current = runToken;
      setSearchQuery(query);
      // 新搜索：关闭旧连接并清空结果
      eventSourceRef.current = closeEventSourceSafely(eventSourceRef.current);
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

      const currentFluidSearch = getRuntimeFluidSearchEnabled();

      // 如果读取的配置与当前状态不同，更新状态
      if (currentFluidSearch !== useFluidSearch) {
        setUseFluidSearch(currentFluidSearch);
      }

      if (currentFluidSearch) {
        // 流式搜索：打开新的流式连接
        const es = new EventSource(
          `/api/search/stream?q=${encodeURIComponent(trimmed)}`,
        );
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          if (!event.data) return;
          try {
            const payload = JSON.parse(event.data);
            if (isStalePayload(trimmed, runToken)) return;
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
                      ? filterAggYearOrder
                      : filterAllYearOrder;
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
          if (isStalePayload(trimmed, runToken)) return;
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
            if (isStalePayload(trimmed, runToken)) return;

            if (data.results && Array.isArray(data.results)) {
              const activeYearOrder =
                viewMode === 'agg' ? filterAggYearOrder : filterAllYearOrder;
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
      searchRunTokenRef.current += 1;
      eventSourceRef.current = closeEventSourceSafely(eventSourceRef.current);
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
    return () => {
      eventSourceRef.current = closeEventSourceSafely(eventSourceRef.current);
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
}

export function closeEventSourceSafely(
  eventSource: EventSource | null,
): EventSource | null {
  if (!eventSource) {
    return null;
  }

  try {
    eventSource.close();
  } catch {}

  return null;
}

export function isStaleSearchPayload({
  currentQuery,
  expectedQuery,
  currentRunToken,
  payloadRunToken,
}: {
  currentQuery: string;
  expectedQuery: string;
  currentRunToken: number;
  payloadRunToken: number;
}) {
  return (
    currentQuery.trim() !== expectedQuery.trim() ||
    currentRunToken !== payloadRunToken
  );
}
