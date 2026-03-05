import crypto from 'crypto';

import { ApiSite } from '@/lib/config';
import { getDetailFromApi } from '@/lib/downstream';
import { SearchResult } from '@/lib/types';

import { ApiBusinessError, ApiValidationError } from '@/server/api/handler';
import { playSessionRepository } from '@/server/repositories/play-session-repository';

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
  playSessionRepository.deleteExpired(Date.now());
}

function trimSessionSources(candidates: SearchResult[]) {
  if (candidates.length <= MAX_SOURCES_PER_SESSION) return candidates;
  const ready = candidates.filter((item) => item.episodes.length > 0);
  const pending = candidates.filter((item) => item.episodes.length === 0);
  return ready.concat(pending).slice(0, MAX_SOURCES_PER_SESSION);
}

function evictOverflowSessions() {
  playSessionRepository.trimToLimit(MAX_PLAY_SESSION_COUNT);
}

function persistSession(session: PlaySession) {
  playSessionRepository.upsert({
    sessionId: session.id,
    username: session.username,
    payloadJson: JSON.stringify(session),
    expiresAt: session.expiresAt,
    updatedAt: Date.now(),
  });
}

function parsePlayType(value: unknown): PlayType {
  return value === 'movie' ? 'movie' : 'tv';
}

function reviveSession(payloadJson: string): PlaySession | null {
  try {
    const parsed = JSON.parse(payloadJson) as Partial<PlaySession>;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.username !== 'string' ||
      !Array.isArray(parsed.sources)
    ) {
      return null;
    }

    const sources: PlaySessionSource[] = parsed.sources
      .map((item): PlaySessionSource | null => {
        if (!item || typeof item !== 'object') return null;
        const sourceItem = item as Partial<PlaySessionSource>;
        const source = String(sourceItem.source || '').trim();
        const id = String(sourceItem.id || '').trim();
        if (!source || !id) return null;

        const snapshot = normalizeSearchResult({
          ...(sourceItem.snapshot || {}),
          source,
          id,
          source_name: sourceItem.sourceName || source,
        });

        const detail = sourceItem.detail
          ? normalizeSearchResult({
              ...sourceItem.detail,
              source,
              id,
              source_name: sourceItem.sourceName || snapshot.source_name,
            })
          : undefined;

        const restored: PlaySessionSource = {
          source,
          id,
          sourceName: String(sourceItem.sourceName || snapshot.source_name),
          snapshot,
          detail,
        };
        return restored;
      })
      .filter((item): item is PlaySessionSource => item !== null);

    if (sources.length === 0) return null;

    const fallbackCurrent = sources[0];
    const hasCurrent = sources.some(
      (item) =>
        item.source === parsed.currentSource && item.id === parsed.currentId,
    );

    const now = Date.now();

    return {
      id: parsed.id,
      username: parsed.username,
      title: String(parsed.title || ''),
      year: normalizeYear(String(parsed.year || 'unknown')),
      type: parsePlayType(parsed.type),
      query: String(parsed.query || ''),
      currentSource: hasCurrent
        ? String(parsed.currentSource)
        : fallbackCurrent.source,
      currentId: hasCurrent ? String(parsed.currentId) : fallbackCurrent.id,
      sources,
      createdAt:
        typeof parsed.createdAt === 'number' && parsed.createdAt > 0
          ? parsed.createdAt
          : now,
      expiresAt:
        typeof parsed.expiresAt === 'number' && parsed.expiresAt > 0
          ? parsed.expiresAt
          : now + PLAY_SESSION_TTL_MS,
    };
  } catch {
    return null;
  }
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
      (source) =>
        source.source === preferredSource && source.id === preferredId,
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
    type: type || (defaultSource.snapshot.episodes.length > 1 ? 'tv' : 'movie'),
    query: (query || '').trim(),
    currentSource: defaultSource.source,
    currentId: defaultSource.id,
    sources,
    createdAt: now,
    expiresAt: now + PLAY_SESSION_TTL_MS,
  };

  persistSession(session);
  evictOverflowSessions();
  return session;
}

export function getPlaySession(
  username: string,
  playSessionId: string,
): PlaySession | null {
  cleanupExpiredSessions();

  const record = playSessionRepository.getBySessionId(playSessionId);
  if (!record) return null;
  if (record.username !== username) return null;

  const session = reviveSession(record.payloadJson);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    cleanupExpiredSessions();
    return null;
  }

  session.expiresAt = Date.now() + PLAY_SESSION_TTL_MS;
  persistSession(session);
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
    throw new ApiBusinessError(
      '播放源不存在',
      400,
      'PLAY_SESSION_SOURCE_MISSING',
    );
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
  persistSession(session);
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
  persistSession(session);
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

function validatePlaySessionId(playSessionId: string): string {
  const id = String(playSessionId || '').trim();
  if (!id) {
    throw new ApiValidationError('缺少播放会话ID');
  }
  return id;
}

export function getPlaySessionOrThrow(
  username: string,
  playSessionId: string,
): PlaySession {
  const session = getPlaySession(
    username,
    validatePlaySessionId(playSessionId),
  );
  if (!session) {
    throw new ApiBusinessError(
      '播放会话不存在或已过期',
      404,
      'PLAY_SESSION_NOT_FOUND',
    );
  }
  return session;
}

export async function getHydratedPlaySessionResponse(
  username: string,
  playSessionId: string,
  apiSites: ApiSite[],
) {
  const session = getPlaySessionOrThrow(username, playSessionId);
  const currentDetail = await hydrateCurrentPlayDetail(session, apiSites);
  return toSessionResponse(session, currentDetail);
}

export async function switchPlaySessionCurrentAndHydrate(
  username: string,
  playSessionId: string,
  source: string,
  id: string,
  apiSites: ApiSite[],
) {
  const normalizedSource = String(source || '').trim();
  const normalizedId = String(id || '').trim();
  if (!normalizedSource || !normalizedId) {
    throw new ApiValidationError('缺少必要参数');
  }

  const session = getPlaySessionOrThrow(username, playSessionId);
  setPlaySessionCurrent(session, normalizedSource, normalizedId);
  const currentDetail = await hydrateCurrentPlayDetail(session, apiSites);
  return toSessionResponse(session, currentDetail);
}
