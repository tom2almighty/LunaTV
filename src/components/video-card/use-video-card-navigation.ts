import { SearchResult } from '@/lib/types';

type BuildPlaySessionPayloadParams = {
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  playGroup?: SearchResult[];
  title: string;
  year?: string;
  searchType?: string;
  query: string;
  source?: string;
  id?: string;
};

export function buildPlaySessionCreateApiPath() {
  return '/api/play/sessions';
}

export function buildPlaySessionResourceApiPath(playSessionId: string) {
  return `/api/play/sessions/${encodeURIComponent(playSessionId)}`;
}

export function buildPlaySessionCurrentApiPath(playSessionId: string) {
  return `${buildPlaySessionResourceApiPath(playSessionId)}/current`;
}

export function buildPlaySessionUrl(playSessionId: string) {
  return `/play?ps=${encodeURIComponent(playSessionId)}`;
}

export function buildPlaySessionPayload({
  from,
  playGroup,
  title,
  year,
  searchType,
  query,
  source,
  id,
}: BuildPlaySessionPayloadParams) {
  if (from === 'search') {
    if (playGroup && playGroup.length > 0) {
      return {
        mode: 'group',
        title,
        year: year || 'unknown',
        type: searchType || undefined,
        query: query || title,
        preferredSource: source || undefined,
        preferredId: id || undefined,
        candidates: playGroup,
      };
    }

    if (source && id) {
      return {
        mode: 'direct',
        source,
        id,
        title,
        year: year || 'unknown',
        type: searchType || undefined,
        query: query || title,
      };
    }
  }

  if (source && id) {
    return {
      mode: 'direct',
      source,
      id,
      title,
      year: year || 'unknown',
      type: searchType || undefined,
      query: query || title,
    };
  }

  return {
    mode: 'search',
    keyword: query || title,
    expectedTitle: title || undefined,
    expectedYear: year || undefined,
    expectedType: searchType || undefined,
  };
}
