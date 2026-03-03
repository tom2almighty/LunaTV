import { useEffect, useState } from 'react';

type UseVideoCardStateParams = {
  episodes?: number;
  sourceNames?: string[];
  doubanId?: number;
};

export function useVideoCardState({
  episodes,
  sourceNames,
  doubanId,
}: UseVideoCardStateParams) {
  const [dynamicEpisodes, setDynamicEpisodes] = useState<number | undefined>(
    episodes,
  );
  const [dynamicSourceNames, setDynamicSourceNames] = useState<
    string[] | undefined
  >(sourceNames);
  const [dynamicDoubanId, setDynamicDoubanId] = useState<number | undefined>(
    doubanId,
  );

  useEffect(() => {
    setDynamicEpisodes(episodes);
  }, [episodes]);

  useEffect(() => {
    setDynamicSourceNames(sourceNames);
  }, [sourceNames]);

  useEffect(() => {
    setDynamicDoubanId(doubanId);
  }, [doubanId]);

  return {
    dynamicEpisodes,
    setDynamicEpisodes,
    dynamicSourceNames,
    setDynamicSourceNames,
    dynamicDoubanId,
    setDynamicDoubanId,
  };
}
