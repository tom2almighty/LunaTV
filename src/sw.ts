import { defaultCache } from '@serwist/next/worker';
import {
  type PrecacheEntry,
  type SerwistGlobalConfig,
  NetworkOnly,
  Serwist,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: Array<PrecacheEntry | string> | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const streamFilePattern = /\.(?:m3u8|ts|m4s|mpd)(?:\?.*)?$/i;
const nonCacheableApiPattern =
  /^\/api\/(?:admin(?:\/|$)|login$|logout$|register$|change-password$|playrecords(?:\/|$)|favorites(?:\/|$)|searchhistory(?:\/|$)|skipconfigs(?:\/|$)|search\/ws(?:\/|$)|server-config$|cron$)/i;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: process.env.NODE_ENV === 'production',
  runtimeCaching: [
    {
      // 用户态与管理态 API 不应落入默认缓存策略
      matcher: ({ request, sameOrigin, url }) =>
        request.method === 'GET' &&
        sameOrigin &&
        nonCacheableApiPattern.test(url.pathname),
      handler: new NetworkOnly(),
    },
    {
      // 直播/点播流媒体分片必须走网络，避免缓存污染与内存暴涨
      matcher: ({ request, url }) =>
        request.method === 'GET' && streamFilePattern.test(url.pathname),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
