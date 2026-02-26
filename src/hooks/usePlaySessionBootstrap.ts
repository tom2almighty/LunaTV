import { useEffect } from 'react';

import { SearchResult } from '@/lib/types';

const MIN_LOADING_VISIBLE_MS = 400;
const READY_STAGE_VISIBLE_MS = 220;

type LoadingStage = 'searching' | 'fetching' | 'ready';

type PlaySessionBootstrapParams = {
  playSessionId: string;
  fallbackSource: string;
  fallbackId: string;
  fallbackTitle: string;
  fallbackYear: string;
  fallbackSearchTitle: string;
  fallbackSourceName: string;
  fallbackType: string;
};

type PlaySessionBootstrapPayload = {
  detail: SearchResult;
  availableSources: SearchResult[];
  searchTitle: string;
  currentSource: string;
  currentId: string;
  title: string;
  year: string;
};

type PlaySessionBootstrapHandlers = {
  setLoading: (value: boolean) => void;
  setSourceSearchLoading: (value: boolean) => void;
  setSourceSearchError: (value: string | null) => void;
  setLoadingStage: (value: LoadingStage) => void;
  setLoadingMessage: (value: string) => void;
  setError: (value: string | null) => void;
  onBootstrapSuccess: (payload: PlaySessionBootstrapPayload) => void;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForMinimumVisibleTime(startedAt: number, minimumMs: number) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < minimumMs) {
    await delay(minimumMs - elapsed);
  }
}

type SessionResolveResult = {
  playSessionId: string;
  mode: 'direct' | 'search' | 'existing';
};

type SessionPayload = {
  detail?: SearchResult;
  available_sources?: SearchResult[];
  search_title?: string;
  current_source?: string;
  current_id?: string;
  year?: string;
  title?: string;
};

export function usePlaySessionBootstrap(
  params: PlaySessionBootstrapParams,
  handlers: PlaySessionBootstrapHandlers,
) {
  const {
    setLoading,
    setSourceSearchLoading,
    setSourceSearchError,
    setLoadingStage,
    setLoadingMessage,
    setError,
    onBootstrapSuccess,
  } = handlers;

  useEffect(() => {
    let cancelled = false;

    const safeSet = (fn: () => void) => {
      if (!cancelled) fn();
    };

    const normalizePlayType = () =>
      params.fallbackType === 'movie' || params.fallbackType === 'tv'
        ? params.fallbackType
        : undefined;

    const hasSearchFallback = () =>
      !!(params.fallbackSearchTitle || params.fallbackTitle);

    const replaceUrlWithSession = (sessionId: string) => {
      safeSet(() => {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('ps', sessionId);
        newUrl.searchParams.delete('source');
        newUrl.searchParams.delete('id');
        newUrl.searchParams.delete('title');
        newUrl.searchParams.delete('year');
        newUrl.searchParams.delete('stitle');
        newUrl.searchParams.delete('sname');
        newUrl.searchParams.delete('stype');
        window.history.replaceState({}, '', newUrl.toString());
      });
    };

    const createSearchSession = async (): Promise<string> => {
      const keyword = (params.fallbackSearchTitle || params.fallbackTitle || '').trim();
      if (!keyword) {
        throw new Error('缺少搜索关键词');
      }

      safeSet(() => {
        setLoadingStage('searching');
        setLoadingMessage('正在搜索可用播放源...');
      });

      const response = await fetch('/api/play/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'search',
          keyword,
          expectedTitle: params.fallbackTitle || undefined,
          expectedYear:
            params.fallbackYear && params.fallbackYear !== 'unknown'
              ? params.fallbackYear
              : undefined,
          expectedType: normalizePlayType(),
          preferredSource: params.fallbackSource || undefined,
          preferredId: params.fallbackId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.play_session_id) {
        throw new Error(data.error || '创建播放会话失败');
      }
      replaceUrlWithSession(String(data.play_session_id));
      return String(data.play_session_id);
    };

    const createDirectSession = async (): Promise<string> => {
      if (!params.fallbackSource || !params.fallbackId) {
        throw new Error('缺少播放源参数');
      }

      safeSet(() => {
        setLoadingStage('fetching');
        setLoadingMessage('正在创建播放会话...');
      });

      const response = await fetch('/api/play/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'direct',
          source: params.fallbackSource,
          id: params.fallbackId,
          title: params.fallbackTitle || undefined,
          year: params.fallbackYear || undefined,
          type: normalizePlayType(),
          query: params.fallbackSearchTitle || params.fallbackTitle || undefined,
          source_name: params.fallbackSourceName || undefined,
          snapshot: {
            source: params.fallbackSource,
            id: params.fallbackId,
            title: params.fallbackTitle || '',
            year: params.fallbackYear || 'unknown',
            source_name: params.fallbackSourceName || '',
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.play_session_id) {
        throw new Error(data.error || '创建播放会话失败');
      }
      replaceUrlWithSession(String(data.play_session_id));
      return String(data.play_session_id);
    };

    const resolvePlaySessionId = async (): Promise<SessionResolveResult> => {
      if (params.playSessionId) {
        return { playSessionId: params.playSessionId, mode: 'existing' };
      }

      if (params.fallbackSource && params.fallbackId) {
        try {
          const playSessionId = await createDirectSession();
          return { playSessionId, mode: 'direct' };
        } catch (error) {
          if (!hasSearchFallback()) {
            throw error;
          }
          const playSessionId = await createSearchSession();
          return { playSessionId, mode: 'search' };
        }
      }

      if (hasSearchFallback()) {
        const playSessionId = await createSearchSession();
        return { playSessionId, mode: 'search' };
      }

      throw new Error('缺少播放会话参数');
    };

    const fetchSessionPayload = async (
      resolvedPlaySessionId: string,
    ): Promise<SessionPayload> => {
      const response = await fetch(
        `/api/play/session?ps=${encodeURIComponent(resolvedPlaySessionId)}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '获取播放会话失败');
      }
      return data;
    };

    const initAll = async () => {
      const startedAt = Date.now();
      safeSet(() => {
        setLoading(true);
        setSourceSearchLoading(true);
        setSourceSearchError(null);
        setLoadingStage('fetching');
        setLoadingMessage('正在加载播放信息...');
      });

      try {
        const resolved = await resolvePlaySessionId();
        let data: SessionPayload;
        try {
          data = await fetchSessionPayload(resolved.playSessionId);
        } catch (error) {
          if (resolved.mode !== 'direct' || !hasSearchFallback()) {
            throw error;
          }
          const recoveredPlaySessionId = await createSearchSession();
          data = await fetchSessionPayload(recoveredPlaySessionId);
        }

        let detailData = data.detail as SearchResult;
        if (!detailData || !detailData.source || !detailData.id) {
          if (hasSearchFallback()) {
            const recoveredPlaySessionId = await createSearchSession();
            data = await fetchSessionPayload(recoveredPlaySessionId);
            detailData = data.detail as SearchResult;
            if (!detailData || !detailData.source || !detailData.id) {
              throw new Error('播放会话数据无效');
            }
          } else {
            throw new Error('播放会话数据无效');
          }
        }
        const sources = (data.available_sources || []) as SearchResult[];

        safeSet(() => {
          onBootstrapSuccess({
            detail: detailData,
            availableSources: sources,
            searchTitle: (data.search_title || '').toString(),
            currentSource: data.current_source || detailData.source,
            currentId: data.current_id || detailData.id,
            year: (data.year || detailData.year || 'unknown').toString(),
            title: (data.title || detailData.title || '').toString(),
          });
        });

        await waitForMinimumVisibleTime(startedAt, MIN_LOADING_VISIBLE_MS);
        safeSet(() => {
          setLoadingStage('ready');
          setLoadingMessage('播放准备完成');
        });
        await delay(READY_STAGE_VISIBLE_MS);
        safeSet(() => setLoading(false));
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载播放会话失败';
        safeSet(() => {
          setSourceSearchError(message);
          setError(message);
          setLoading(false);
        });
      } finally {
        safeSet(() => setSourceSearchLoading(false));
      }
    };

    initAll();

    return () => {
      cancelled = true;
    };
  }, [
    params.playSessionId,
    params.fallbackSource,
    params.fallbackId,
    params.fallbackTitle,
    params.fallbackYear,
    params.fallbackSearchTitle,
    params.fallbackSourceName,
    params.fallbackType,
    setLoading,
    setSourceSearchLoading,
    setSourceSearchError,
    setLoadingStage,
    setLoadingMessage,
    setError,
    onBootstrapSuccess,
  ]);
}
