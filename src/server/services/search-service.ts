/* eslint-disable @typescript-eslint/no-explicit-any */

import { ApiSite, getAvailableApiSites, getConfig } from '@/lib/config';
import { getDetailFromApi, searchFromApi } from '@/lib/downstream';
import { yellowWords } from '@/lib/yellow';

export async function resolveSearchContext(username: string) {
  const config = await getConfig();
  const apiSites = await getAvailableApiSites(username);
  return {
    apiSites,
    disableYellowFilter: Boolean(config.SiteConfig.DisableYellowFilter),
  };
}

function filterYellowResults(
  results: any[],
  disableYellowFilter: boolean,
): any[] {
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
): Promise<any[]> {
  const timeoutMs = options?.timeoutMs ?? 20000;
  const searchPromise = Promise.race([
    searchFromApi(site, query, options?.signal),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${site.name} timeout`)), timeoutMs),
    ),
  ]);
  const results = (await searchPromise) as any[];
  return filterYellowResults(results, disableYellowFilter);
}

export async function searchAllSources(
  username: string,
  query: string,
): Promise<any[]> {
  const { apiSites, disableYellowFilter } =
    await resolveSearchContext(username);
  const searchPromises = apiSites.map((site) =>
    searchSiteWithTimeout(site, query, disableYellowFilter).catch(() => []),
  );

  const results = await Promise.allSettled(searchPromises);
  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => (result as PromiseFulfilledResult<any[]>).value)
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
    throw new Error('无效的API来源');
  }

  return getDetailFromApi(apiSite, videoId);
}
