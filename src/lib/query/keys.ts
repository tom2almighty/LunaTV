export const queryKeys = {
  site: ['site'] as const,
  authVerify: ['auth', 'verify'] as const,
  recommendations: ['recommendations'] as const,
  douban: (params: { kind: string; category: string; type: string }) =>
    ['douban', params] as const,
  detail: (source: string, id: string) => ['detail', source, id] as const,
  search: (query: string) => ['search', query] as const,
  playRecords: ['play-records'] as const,
  searchHistory: ['search-history'] as const,
};
