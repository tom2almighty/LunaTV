/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';
import { createPlaySession } from '@/lib/play-session';
import { SearchResult } from '@/lib/types';
import { yellowWords } from '@/lib/yellow';

export const runtime = 'nodejs';

type PlayMode = 'group' | 'direct' | 'search';
const SEARCH_SOURCE_TIMEOUT_MS = 9000;

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
  body: any,
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

export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const mode = body?.mode as PlayMode;
  if (!mode || !['group', 'direct', 'search'].includes(mode)) {
    return NextResponse.json({ error: '无效的模式' }, { status: 400 });
  }

  try {
    if (mode === 'group') {
      const candidates = parseCandidateList(body.candidates);
      if (candidates.length === 0) {
        return NextResponse.json({ error: '缺少候选播放源' }, { status: 400 });
      }

      const session = createPlaySession({
        username: authInfo.username,
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

      return NextResponse.json({ play_session_id: session.id });
    }

    if (mode === 'direct') {
      const source = String(body.source || '');
      const id = String(body.id || '');
      if (!source || !id) {
        return NextResponse.json(
          { error: '缺少 source 或 id' },
          { status: 400 },
        );
      }

      const apiSites = await getAvailableApiSites(authInfo.username);
      const apiSite = apiSites.find((site) => site.key === source);
      if (!apiSite) {
        return NextResponse.json({ error: '无效的API来源' }, { status: 400 });
      }

      const snapshot = buildDirectSnapshot(body, source, id, apiSite.name);
      const session = createPlaySession({
        username: authInfo.username,
        title: String(body.title || snapshot.title || ''),
        year: String(body.year || snapshot.year || 'unknown'),
        type: parseType(body.type),
        query: String(body.query || body.title || snapshot.title || ''),
        candidates: [snapshot],
        preferredSource: source,
        preferredId: id,
      });

      return NextResponse.json({ play_session_id: session.id });
    }

    const keyword = String(body.keyword || '').trim();
    if (!keyword) {
      return NextResponse.json({ error: '缺少搜索关键词' }, { status: 400 });
    }

    const expectedTitle = body.expectedTitle
      ? String(body.expectedTitle).trim()
      : undefined;
    const expectedYear = body.expectedYear
      ? String(body.expectedYear).trim()
      : undefined;
    const expectedType = parseType(body.expectedType);
    const candidates = await searchCandidatesAcrossSources(
      authInfo.username,
      keyword,
      expectedTitle,
      expectedYear,
      expectedType,
    );

    if (candidates.length === 0) {
      return NextResponse.json({ error: '未找到匹配播放源' }, { status: 404 });
    }

    const session = createPlaySession({
      username: authInfo.username,
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

    return NextResponse.json({ play_session_id: session.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建播放会话失败' },
      { status: 500 },
    );
  }
}
