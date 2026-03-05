type ReuseDecisionInput = {
  hasPlayerInstance: boolean;
  isWebkit: boolean;
};

export function shouldReuseExistingPlayer({
  hasPlayerInstance,
  isWebkit,
}: ReuseDecisionInput) {
  return hasPlayerInstance && !isWebkit;
}

export function isPlayableEpisodeIndex(
  episodeIndex: number,
  episodeCount: number,
) {
  return episodeIndex >= 0 && episodeIndex < episodeCount;
}
