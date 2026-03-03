import { useEffect } from 'react';

import { SearchResult } from '@/lib/types';

const MIN_LOADING_VISIBLE_MS = 400;
const READY_STAGE_VISIBLE_MS = 220;

type LoadingStage = 'searching' | 'fetching' | 'ready';

type PlaySessionBootstrapParams = {
  playSessionId: string;
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

    const fetchSessionPayload = async (
      resolvedPlaySessionId: string,
    ): Promise<SessionPayload> => {
      const response = await fetch(
        `/api/play/sessions/${encodeURIComponent(resolvedPlaySessionId)}`,
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
        if (!params.playSessionId) {
          throw new Error('缺少播放会话参数，请返回搜索页重试');
        }

        const data: SessionPayload = await fetchSessionPayload(
          params.playSessionId,
        );

        const detailData = data.detail as SearchResult;
        if (!detailData || !detailData.source || !detailData.id) {
          throw new Error('播放会话数据无效');
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
    setLoading,
    setSourceSearchLoading,
    setSourceSearchError,
    setLoadingStage,
    setLoadingMessage,
    setError,
    onBootstrapSuccess,
  ]);
}
