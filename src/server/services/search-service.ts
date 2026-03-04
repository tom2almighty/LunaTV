/* eslint-disable @typescript-eslint/no-explicit-any */

import { ApiSite, getAvailableApiSites, getConfig } from '@/lib/config';
import { getDetailFromApi, searchFromApi } from '@/lib/downstream';
import { createPlaySession } from '@/lib/play-session';
import { createAbortableSearchController } from '@/lib/search/abortable-search';
import { SearchResult } from '@/lib/types';
import { yellowWords } from '@/lib/yellow';

import { ApiBusinessError, ApiValidationError } from '@/server/api/handler';

const SEARCH_SOURCE_TIMEOUT_MS = 9000;

type PlayMode = 'group' | 'direct' | 'search';

function normalize(str?: string) {
  return (str || '').replace(/\s+/g, '').trim().toLowerCase();
}

function parseType(value: unknown): 'movie' | 'tv' | undefined {
  if (value === 'movie' || value === 'tv') return value;
  return undefined;
}

function parseCandidateList(raw: unknown): SearchResult[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as SearchResult)
    .filter((item) => !!item.source && !!item.id);
}

function normalizeYear(year?: string): string {
  if (!year) return 'unknown';
  const matched = year.match(/\d{4}/)?.[0];
  return matched || 'unknown';
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => typeof item === 'string');
}

function buildDirectSnapshot(
  body: Record<string, unknown>,
  source: string,
  id: string,
  sourceName: string,
): SearchResult {
  const snapshot =
    body?.snapshot && typeof body.snapshot === 'object'
      ? (body.snapshot as Partial<SearchResult>)
      : {};

  return {
    id,
    source,
    source_name: String(snapshot.source_name || body.source_name || sourceName),
    title: String(snapshot.title || body.title || ''),
    poster: String(snapshot.poster || body.poster || ''),
    year: normalizeYear(String(snapshot.year || body.year || 'unknown')),
    episodes: toStringArray(snapshot.episodes),
    episodes_titles: toStringArray(snapshot.episodes_titles),
    class: String(snapshot.class || ''),
    desc: String(snapshot.desc || ''),
    type_name: String(snapshot.type_name || ''),
    douban_id: Number(snapshot.douban_id || 0),
    score: String(snapshot.score || ''),
    actors: String(snapshot.actors || ''),
    directors: String(snapshot.directors || ''),
    area: String(snapshot.area || ''),
    lang: String(snapshot.lang || ''),
    remark: String(snapshot.remark || ''),
  };
}

export async function resolveSearchContext(username: string) {
  const config = await getConfig();
  const apiSites = await getAvailableApiSites(username);
  return {
    apiSites,
    disableYellowFilter: Boolean(config.SiteConfig.DisableYellowFilter),
  };
}

function filterYellowResults(
  results: SearchResult[],
  disableYellowFilter: boolean,
): SearchResult[] {
  if (disableYellowFilter) {
    return results;
  }

  return results.filter((result) => {
    const typeName = result.type_name || '';
    return !yellowWords.some((word: string) => typeName.includes(word));
  });
}

export async function searchSiteWithTimeout(
  site: ApiSite,
  query: string,
  disableYellowFilter: boolean,
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<SearchResult[]> {
  const timeoutMs = options?.timeoutMs ?? 20000;
  const searchPromise = Promise.race([
    searchFromApi(site, query, options?.signal),
    new Promise<SearchResult[]>((_, reject) =>
      setTimeout(() => reject(new Error(`${site.name} timeout`)), timeoutMs),
    ),
  ]);
  const results = (await searchPromise) as SearchResult[];
  return filterYellowResults(results, disableYellowFilter);
}

export async function searchAllSources(
  username: string,
  query: string,
): Promise<SearchResult[]> {
  const { apiSites, disableYellowFilter } =
    await resolveSearchContext(username);
  const searchPromises = apiSites.map((site) =>
    searchSiteWithTimeout(site, query, disableYellowFilter).catch(() => []),
  );

  const results = await Promise.allSettled(searchPromises);
  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<SearchResult[]>).value)
    .flat();
}

export async function getApiSiteBySource(
  source: string,
  username?: string,
): Promise<ApiSite | null> {
  const apiSites = await getAvailableApiSites(username);
  return apiSites.find((site) => site.key === source) || null;
}

export async function getVideoDetailBySource(
  source: string,
  videoId: string,
  username?: string,
) {
  const apiSite = await getApiSiteBySource(source, username);
  if (!apiSite) {
    throw new ApiValidationError('无效的API来源');
  }

  return getDetailFromApi(apiSite, videoId);
}

function applySearchFilters(
  results: SearchResult[],
  expectedTitle?: string,
  expectedYear?: string,
  expectedType?: 'movie' | 'tv',
) {
  const normalizedExpectedTitle = normalize(expectedTitle);

  return results.filter((result) => {
    if (normalizedExpectedTitle) {
      const normalizedResultTitle = normalize(result.title);
      const titleMatched =
        !!normalizedResultTitle &&
        (normalizedResultTitle === normalizedExpectedTitle ||
          normalizedResultTitle.includes(normalizedExpectedTitle) ||
          normalizedExpectedTitle.includes(normalizedResultTitle));
      if (!titleMatched) return false;
    }

    if (expectedYear && expectedYear !== 'unknown') {
      if (
        (result.year || 'unknown').toLowerCase() !== expectedYear.toLowerCase()
      ) {
        return false;
      }
    }

    if (expectedType) {
      const isTv = result.episodes.length > 1;
      if (expectedType === 'tv' && !isTv) return false;
      if (expectedType === 'movie' && isTv) return false;
    }

    return true;
  });
}

function pickBestCandidates(
  results: SearchResult[],
  expectedTitle?: string,
  expectedYear?: string,
  expectedType?: 'movie' | 'tv',
) {
  const strict = applySearchFilters(
    results,
    expectedTitle,
    expectedYear,
    expectedType,
  );
  if (strict.length > 0) return strict;

  const yearAndType = applySearchFilters(
    results,
    undefined,
    expectedYear,
    expectedType,
  );
  if (yearAndType.length > 0) return yearAndType;

  const typeOnly = applySearchFilters(
    results,
    undefined,
    undefined,
    expectedType,
  );
  if (typeOnly.length > 0) return typeOnly;

  return results;
}

async function searchCandidatesAcrossSources(
  username: string,
  keyword: string,
  expectedTitle?: string,
  expectedYear?: string,
  expectedType?: 'movie' | 'tv',
): Promise<SearchResult[]> {
  const config = await getConfig();
  const apiSites = await getAvailableApiSites(username);

  const searches = apiSites.map((site) =>
    Promise.race([
      searchFromApi(site, keyword),
      new Promise<SearchResult[]>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${site.name} timeout`)),
          SEARCH_SOURCE_TIMEOUT_MS,
        ),
      ),
    ]).catch(() => []),
  );

  const settled = await Promise.allSettled(searches);
  const merged: SearchResult[] = settled
    .filter((item) => item.status === 'fulfilled')
    .flatMap((item) => (item as PromiseFulfilledResult<SearchResult[]>).value);

  const matchedCandidates = pickBestCandidates(
    merged,
    expectedTitle,
    expectedYear,
    expectedType,
  );

  if (config.SiteConfig.DisableYellowFilter) {
    return matchedCandidates;
  }

  return matchedCandidates.filter((result) => {
    const typeName = result.type_name || '';
    return !yellowWords.some((word: string) => typeName.includes(word));
  });
}

function getBodyObject(rawBody: unknown): Record<string, unknown> {
  if (!rawBody || typeof rawBody !== 'object') {
    throw new ApiValidationError('请求体格式错误');
  }
  return rawBody as Record<string, unknown>;
}

function parsePlayMode(body: Record<string, unknown>): PlayMode {
  const mode = String(body.mode || '') as PlayMode;
  if (!mode || !['group', 'direct', 'search'].includes(mode)) {
    throw new ApiValidationError('无效的模式');
  }
  return mode;
}

export async function createPlaySessionByRequest(
  username: string,
  rawBody: unknown,
): Promise<{ play_session_id: string }> {
  const body = getBodyObject(rawBody);
  const mode = parsePlayMode(body);

  if (mode === 'group') {
    const candidates = parseCandidateList(body.candidates);
    if (candidates.length === 0) {
      throw new ApiValidationError('缺少候选播放源');
    }

    const session = createPlaySession({
      username,
      title: String(body.title || candidates[0].title || ''),
      year: String(body.year || candidates[0].year || 'unknown'),
      type: parseType(body.type),
      query: String(body.query || ''),
      candidates,
      preferredSource: body.preferredSource
        ? String(body.preferredSource)
        : undefined,
      preferredId: body.preferredId ? String(body.preferredId) : undefined,
    });

    return { play_session_id: session.id };
  }

  if (mode === 'direct') {
    const source = String(body.source || '');
    const id = String(body.id || '');
    if (!source || !id) {
      throw new ApiValidationError('缺少 source 或 id');
    }

    const apiSites = await getAvailableApiSites(username);
    const apiSite = apiSites.find((site) => site.key === source);
    if (!apiSite) {
      throw new ApiValidationError('无效的API来源');
    }

    const snapshot = buildDirectSnapshot(body, source, id, apiSite.name);
    const session = createPlaySession({
      username,
      title: String(body.title || snapshot.title || ''),
      year: String(body.year || snapshot.year || 'unknown'),
      type: parseType(body.type),
      query: String(body.query || body.title || snapshot.title || ''),
      candidates: [snapshot],
      preferredSource: source,
      preferredId: id,
    });

    return { play_session_id: session.id };
  }

  const keyword = String(body.keyword || '').trim();
  if (!keyword) {
    throw new ApiValidationError('缺少搜索关键词');
  }

  const expectedTitle = body.expectedTitle
    ? String(body.expectedTitle).trim()
    : undefined;
  const expectedYear = body.expectedYear
    ? String(body.expectedYear).trim()
    : undefined;
  const expectedType = parseType(body.expectedType);

  const candidates = await searchCandidatesAcrossSources(
    username,
    keyword,
    expectedTitle,
    expectedYear,
    expectedType,
  );

  if (candidates.length === 0) {
    throw new ApiBusinessError(
      '未找到匹配播放源',
      404,
      'PLAY_SOURCE_NOT_FOUND',
    );
  }

  const session = createPlaySession({
    username,
    title: expectedTitle || candidates[0].title || keyword,
    year: expectedYear || candidates[0].year || 'unknown',
    type: expectedType,
    query: keyword,
    candidates,
    preferredSource: body.preferredSource
      ? String(body.preferredSource)
      : undefined,
    preferredId: body.preferredId ? String(body.preferredId) : undefined,
  });

  return { play_session_id: session.id };
}

export async function createSearchStreamResponse(
  username: string,
  query: string,
): Promise<Response> {
  if (!query) {
    throw new ApiValidationError('搜索关键词不能为空');
  }

  const { apiSites, disableYellowFilter } =
    await resolveSearchContext(username);

  let streamClosed = false;
  const abortableSearch = createAbortableSearchController();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const safeEnqueue = (data: Uint8Array) => {
        try {
          if (
            streamClosed ||
            (!controller.desiredSize && controller.desiredSize !== 0)
          ) {
            return false;
          }
          controller.enqueue(data);
          return true;
        } catch {
          streamClosed = true;
          return false;
        }
      };

      const startEvent = `data: ${JSON.stringify({
        type: 'start',
        query,
        totalSources: apiSites.length,
        timestamp: Date.now(),
      })}\n\n`;

      if (!safeEnqueue(encoder.encode(startEvent))) {
        return;
      }

      let completedSources = 0;
      const allResults: SearchResult[] = [];

      const searchPromises = apiSites.map(async (site) => {
        try {
          const filteredResults = await searchSiteWithTimeout(
            site,
            query,
            disableYellowFilter,
            { signal: abortableSearch.signal, timeoutMs: 20000 },
          );

          completedSources += 1;
          if (!streamClosed) {
            const sourceEvent = `data: ${JSON.stringify({
              type: 'source_result',
              source: site.key,
              sourceName: site.name,
              results: filteredResults,
              timestamp: Date.now(),
            })}\n\n`;

            if (!safeEnqueue(encoder.encode(sourceEvent))) {
              streamClosed = true;
              return;
            }
          }

          if (filteredResults.length > 0) {
            allResults.push(...filteredResults);
          }
        } catch (error) {
          completedSources += 1;

          if (!streamClosed) {
            const errorEvent = `data: ${JSON.stringify({
              type: 'source_error',
              source: site.key,
              sourceName: site.name,
              error: error instanceof Error ? error.message : '搜索失败',
              timestamp: Date.now(),
            })}\n\n`;

            if (!safeEnqueue(encoder.encode(errorEvent))) {
              streamClosed = true;
              return;
            }
          }
        }

        if (completedSources === apiSites.length && !streamClosed) {
          const completeEvent = `data: ${JSON.stringify({
            type: 'complete',
            totalResults: allResults.length,
            completedSources,
            timestamp: Date.now(),
          })}\n\n`;

          if (safeEnqueue(encoder.encode(completeEvent))) {
            controller.close();
          }
        }
      });

      await Promise.allSettled(searchPromises);
    },

    cancel() {
      streamClosed = true;
      abortableSearch.abort('sse stream cancelled');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
