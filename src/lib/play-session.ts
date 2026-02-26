import crypto from 'crypto';

import { ApiSite } from '@/lib/config';
import { getDetailFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';

const PLAY_SESSION_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_PLAY_SESSION_COUNT = 300;
const DEFAULT_MAX_SOURCES_PER_SESSION = 50;

function parseLimit(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const MAX_PLAY_SESSION_COUNT = parseLimit(
  process.env.PLAY_SESSION_MAX_COUNT,
  DEFAULT_MAX_PLAY_SESSION_COUNT,
);
const MAX_SOURCES_PER_SESSION = parseLimit(
  process.env.PLAY_SESSION_MAX_SOURCES,
  DEFAULT_MAX_SOURCES_PER_SESSION,
);

type PlayType = 'movie' | 'tv';

type PlaySessionSource = {
  source: string;
  id: string;
  sourceName: string;
  snapshot: SearchResult;
  detail?: SearchResult;
};

type PlaySession = {
  id: string;
  username: string;
  title: string;
  year: string;
  type: PlayType;
  query: string;
  currentSource: string;
  currentId: string;
  sources: PlaySessionSource[];
  createdAt: number;
  expiresAt: number;
};

type CreatePlaySessionInput = {
  username: string;
  title: string;
  year?: string;
  type?: PlayType;
  query?: string;
  candidates: SearchResult[];
  preferredSource?: string;
  preferredId?: string;
};

const PLAY_SESSION_CACHE = new Map<string, PlaySession>();

function normalizeYear(year?: string): string {
  if (!year) return 'unknown';
  const matched = year.match(/\d{4}/)?.[0];
  return matched || 'unknown';
}

function normalizeSearchResult(result: Partial<SearchResult>): SearchResult {
  return {
    id: String(result.id || ''),
    title: (result.title || '').trim(),
    poster: result.poster || '',
    episodes: Array.isArray(result.episodes)
      ? result.episodes.filter((v) => typeof v === 'string')
      : [],
    episodes_titles: Array.isArray(result.episodes_titles)
      ? result.episodes_titles.filter((v) => typeof v === 'string')
      : [],
    source: String(result.source || ''),
    source_name: result.source_name || '',
    class: result.class || '',
    year: normalizeYear(result.year),
    desc: result.desc || '',
    type_name: result.type_name || '',
    douban_id: result.douban_id || 0,
    score: result.score || '',
    actors: result.actors || '',
    directors: result.directors || '',
    area: result.area || '',
    lang: result.lang || '',
    remark: result.remark || '',
  };
}

function cleanupExpiredSessions() {
  const now = Date.now();
  PLAY_SESSION_CACHE.forEach((session, id) => {
    if (session.expiresAt <= now) {
      PLAY_SESSION_CACHE.delete(id);
    }
  });
}

function trimSessionSources(candidates: SearchResult[]) {
  if (candidates.length <= MAX_SOURCES_PER_SESSION) return candidates;
  const ready = candidates.filter((item) => item.episodes.length > 0);
  const pending = candidates.filter((item) => item.episodes.length === 0);
  return ready.concat(pending).slice(0, MAX_SOURCES_PER_SESSION);
}

function evictOverflowSessions() {
  while (PLAY_SESSION_CACHE.size >= MAX_PLAY_SESSION_COUNT) {
    const oldest = PLAY_SESSION_CACHE.keys().next().value as string | undefined;
    if (!oldest) return;
    PLAY_SESSION_CACHE.delete(oldest);
  }
}

function touchSession(sessionId: string, session: PlaySession) {
  PLAY_SESSION_CACHE.delete(sessionId);
  PLAY_SESSION_CACHE.set(sessionId, session);
}

function dedupeCandidates(candidates: SearchResult[]) {
  const map = new Map<string, SearchResult>();
  candidates.forEach((item) => {
    const normalized = normalizeSearchResult(item);
    if (!normalized.source || !normalized.id) return;
    const key = `${normalized.source}+${normalized.id}`;
    if (!map.has(key)) {
      map.set(key, normalized);
    }
  });
  return trimSessionSources(Array.from(map.values()));
}

function pickDefaultCurrentSource(
  sources: PlaySessionSource[],
  preferredSource?: string,
  preferredId?: string,
) {
  if (preferredSource && preferredId) {
    const preferred = sources.find(
      (source) => source.source === preferredSource && source.id === preferredId,
    );
    if (preferred) {
      return preferred;
    }
  }

  const ready = sources.find((source) => source.snapshot.episodes.length > 0);
  if (ready) return ready;
  return sources[0];
}

export function createPlaySession({
  username,
  title,
  year,
  type,
  query,
  candidates,
  preferredSource,
  preferredId,
}: CreatePlaySessionInput): PlaySession {
  cleanupExpiredSessions();

  const normalizedCandidates = dedupeCandidates(candidates);
  if (normalizedCandidates.length === 0) {
    throw new Error('没有可用播放源');
  }

  const sources: PlaySessionSource[] = normalizedCandidates.map((item) => ({
    source: item.source,
    id: item.id,
    sourceName: item.source_name,
    snapshot: item,
    detail: item.episodes.length > 0 ? item : undefined,
  }));

  const defaultSource = pickDefaultCurrentSource(
    sources,
    preferredSource,
    preferredId,
  );

  const now = Date.now();
  const session: PlaySession = {
    id: crypto.randomUUID().replace(/-/g, ''),
    username,
    title: (title || defaultSource.snapshot.title).trim(),
    year: normalizeYear(year || defaultSource.snapshot.year),
    type:
      type ||
      (defaultSource.snapshot.episodes.length > 1 ? 'tv' : 'movie'),
    query: (query || '').trim(),
    currentSource: defaultSource.source,
    currentId: defaultSource.id,
    sources,
    createdAt: now,
    expiresAt: now + PLAY_SESSION_TTL_MS,
  };

  evictOverflowSessions();
  PLAY_SESSION_CACHE.set(session.id, session);
  return session;
}

export function getPlaySession(
  username: string,
  playSessionId: string,
): PlaySession | null {
  cleanupExpiredSessions();
  const session = PLAY_SESSION_CACHE.get(playSessionId);
  if (!session) return null;
  if (session.username !== username) return null;
  session.expiresAt = Date.now() + PLAY_SESSION_TTL_MS;
  touchSession(playSessionId, session);
  return session;
}

function findSessionSource(
  session: PlaySession,
  source: string,
  id: string,
): PlaySessionSource {
  const sourceItem = session.sources.find(
    (item) => item.source === source && item.id === id,
  );
  if (!sourceItem) {
    throw new Error('播放源不存在');
  }
  return sourceItem;
}

export function setPlaySessionCurrent(
  session: PlaySession,
  source: string,
  id: string,
) {
  findSessionSource(session, source, id);
  session.currentSource = source;
  session.currentId = id;
  session.expiresAt = Date.now() + PLAY_SESSION_TTL_MS;
  touchSession(session.id, session);
}

async function resolveSourceDetail(
  sourceItem: PlaySessionSource,
  apiSites: ApiSite[],
): Promise<SearchResult> {
  if (sourceItem.detail) return sourceItem.detail;
  if (sourceItem.snapshot.episodes.length > 0) {
    sourceItem.detail = sourceItem.snapshot;
    return sourceItem.detail;
  }

  const apiSite = apiSites.find((site) => site.key === sourceItem.source);
  if (!apiSite) {
    throw new Error('无效的API来源');
  }

  const detail = await getDetailFromApi(apiSite, sourceItem.id);
  sourceItem.detail = normalizeSearchResult({
    ...detail,
    source: sourceItem.source,
    source_name: detail.source_name || sourceItem.sourceName,
    id: sourceItem.id,
  });
  return sourceItem.detail;
}

export async function hydrateCurrentPlayDetail(
  session: PlaySession,
  apiSites: ApiSite[],
): Promise<SearchResult> {
  const current = findSessionSource(
    session,
    session.currentSource,
    session.currentId,
  );
  const detail = await resolveSourceDetail(current, apiSites);
  if (!session.title) session.title = detail.title;
  if (!session.year || session.year === 'unknown') session.year = detail.year;
  return detail;
}

export function toSessionResponse(
  session: PlaySession,
  currentDetail: SearchResult,
) {
  const availableSources = session.sources.map((item) => {
    if (item.detail) return item.detail;
    return normalizeSearchResult(item.snapshot);
  });

  return {
    play_session_id: session.id,
    search_title: session.query,
    title: session.title || currentDetail.title,
    year: session.year || currentDetail.year,
    type: session.type,
    current_source: session.currentSource,
    current_id: session.currentId,
    detail: currentDetail,
    available_sources: availableSources,
  };
}
