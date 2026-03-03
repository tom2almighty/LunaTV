import { Dispatch, RefObject, SetStateAction, useCallback } from 'react';

import { SearchResult } from '@/lib/types';

type UsePlayPageActionsParams = {
  totalEpisodes: number;
  detailRef: RefObject<SearchResult | null>;
  currentEpisodeIndexRef: RefObject<number>;
  artPlayerRef: RefObject<{ paused?: boolean } | null>;
  setCurrentEpisodeIndex: Dispatch<SetStateAction<number>>;
  saveCurrentPlayProgress: () => void;
};

export function usePlayPageActions({
  totalEpisodes,
  detailRef,
  currentEpisodeIndexRef,
  artPlayerRef,
  setCurrentEpisodeIndex,
  saveCurrentPlayProgress,
}: UsePlayPageActionsParams) {
  const handleEpisodeChange = useCallback(
    (episodeNumber: number) => {
      if (episodeNumber >= 0 && episodeNumber < totalEpisodes) {
        if (artPlayerRef.current && artPlayerRef.current.paused) {
          saveCurrentPlayProgress();
        }
        setCurrentEpisodeIndex(episodeNumber);
      }
    },
    [
      artPlayerRef,
      saveCurrentPlayProgress,
      setCurrentEpisodeIndex,
      totalEpisodes,
    ],
  );

  const handlePreviousEpisode = useCallback(() => {
    const detail = detailRef.current;
    const index = currentEpisodeIndexRef.current;
    if (detail && detail.episodes && index > 0) {
      if (artPlayerRef.current && !artPlayerRef.current.paused) {
        saveCurrentPlayProgress();
      }
      setCurrentEpisodeIndex(index - 1);
    }
  }, [
    artPlayerRef,
    currentEpisodeIndexRef,
    detailRef,
    saveCurrentPlayProgress,
    setCurrentEpisodeIndex,
  ]);

  const handleNextEpisode = useCallback(() => {
    const detail = detailRef.current;
    const index = currentEpisodeIndexRef.current;
    if (detail && detail.episodes && index < detail.episodes.length - 1) {
      if (artPlayerRef.current && !artPlayerRef.current.paused) {
        saveCurrentPlayProgress();
      }
      setCurrentEpisodeIndex(index + 1);
    }
  }, [
    artPlayerRef,
    currentEpisodeIndexRef,
    detailRef,
    saveCurrentPlayProgress,
    setCurrentEpisodeIndex,
  ]);

  return {
    handleEpisodeChange,
    handlePreviousEpisode,
    handleNextEpisode,
  };
}
