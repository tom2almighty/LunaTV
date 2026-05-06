import {
  createCmsClient,
  createFetchAdapter,
  createUrlPrefixProxyStrategy,
  type CmsClient,
  type VideoSource,
} from '@ouonnki/cms-core';
import { loadSources } from './source-loader';

let clientInstance: CmsClient | null = null;
let clientSources: VideoSource[] = [];
let sourcesLoaded = false;

export { type CmsClient, type VideoSource };

function getConcurrencyLimit(): number {
  const parsed = Number.parseInt(import.meta.env.VITE_SEARCH_CONCURRENCY || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return Math.min(20, parsed);
}

export function getCmsClient(): CmsClient {
  if (!clientInstance) {
    // Search and detail go through the server-side /api/cms proxy: most
    // CMS sources don't expose CORS headers and many require a non-empty
    // User-Agent, both of which the browser cannot supply on its own.
    // Video playback (m3u8 / ts) still goes browser → source directly.
    clientInstance = createCmsClient({
      requestAdapter: createFetchAdapter(),
      proxyStrategy: createUrlPrefixProxyStrategy('/api/cms?url='),
      concurrencyLimit: getConcurrencyLimit(),
    });
  }
  return clientInstance;
}

export async function ensureSourcesLoaded(): Promise<VideoSource[]> {
  if (!sourcesLoaded) {
    clientSources = await loadSources();
    sourcesLoaded = true;
    if (clientSources.length > 0) {
      console.log(`CMS sources loaded: ${clientSources.length} sources`);
    }
  }
  return clientSources;
}

export function getCmsSources(): VideoSource[] {
  return clientSources;
}
