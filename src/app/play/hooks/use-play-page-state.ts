import { useCallback, useState } from 'react';

import { SearchResult } from '@/lib/types';

export type PlayBootstrapPayload = {
  detail: SearchResult;
  availableSources: SearchResult[];
  searchTitle: string;
  currentSource: string;
  currentId: string;
  title: string;
  year: string;
};

export function resolveEpisodeIndexOnSourceChange(
  currentEpisodeIndex: number,
  nextEpisodeCount: number,
) {
  if (nextEpisodeCount <= 0) {
    return 0;
  }
  return currentEpisodeIndex >= nextEpisodeCount ? 0 : currentEpisodeIndex;
}

export function usePlayPageState() {
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<
    'searching' | 'fetching' | 'ready'
  >('fetching');
  const [loadingMessage, setLoadingMessage] = useState('正在加载播放信息...');
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SearchResult | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoYear, setVideoYear] = useState('');
  const [videoCover, setVideoCover] = useState('');
  const [videoDoubanId, setVideoDoubanId] = useState(0);
  const [currentSource, setCurrentSource] = useState('');
  const [currentId, setCurrentId] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [availableSources, setAvailableSources] = useState<SearchResult[]>([]);
  const [sourceSearchLoading, setSourceSearchLoading] = useState(false);
  const [sourceSearchError, setSourceSearchError] = useState<string | null>(
    null,
  );
  const [isEpisodeSelectorCollapsed, setIsEpisodeSelectorCollapsed] =
    useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoLoadingStage, setVideoLoadingStage] = useState<
    'initing' | 'sourceChanging'
  >('initing');

  const handleBootstrapSuccess = useCallback(
    (payload: PlayBootstrapPayload) => {
      const detailData = payload.detail;
      setError(null);
      setAvailableSources(payload.availableSources);
      setSearchTitle(payload.searchTitle);
      setCurrentSource(payload.currentSource);
      setCurrentId(payload.currentId);
      setVideoYear(payload.year);
      setVideoTitle(payload.title);
      setVideoCover(detailData.poster || '');
      setVideoDoubanId(detailData.douban_id || 0);
      setDetail(detailData);
      setCurrentEpisodeIndex((prev) =>
        resolveEpisodeIndexOnSourceChange(prev, detailData.episodes.length),
      );
    },
    [],
  );

  const totalEpisodes = detail?.episodes?.length || 0;

  return {
    loading,
    setLoading,
    loadingStage,
    setLoadingStage,
    loadingMessage,
    setLoadingMessage,
    error,
    setError,
    detail,
    setDetail,
    videoTitle,
    setVideoTitle,
    videoYear,
    setVideoYear,
    videoCover,
    setVideoCover,
    videoDoubanId,
    setVideoDoubanId,
    currentSource,
    setCurrentSource,
    currentId,
    setCurrentId,
    searchTitle,
    setSearchTitle,
    currentEpisodeIndex,
    setCurrentEpisodeIndex,
    totalEpisodes,
    availableSources,
    setAvailableSources,
    sourceSearchLoading,
    setSourceSearchLoading,
    sourceSearchError,
    setSourceSearchError,
    isEpisodeSelectorCollapsed,
    setIsEpisodeSelectorCollapsed,
    isVideoLoading,
    setIsVideoLoading,
    videoLoadingStage,
    setVideoLoadingStage,
    handleBootstrapSuccess,
  };
}
