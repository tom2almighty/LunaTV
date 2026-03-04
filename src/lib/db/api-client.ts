/* eslint-disable no-console */
'use client';

/**
 * API 请求封装 + 通用工具
 */

import { requestJson, requestWithAuth } from '@/lib/api/client';

export function triggerGlobalError(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('globalError', { detail: { message } }),
    );
  }
}

export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

export function buildResourceIdentityPath(source: string, id: string): string {
  return `${encodeURIComponent(source)}/${encodeURIComponent(id)}`;
}

export async function fetchWithAuth(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  return requestWithAuth(url, options);
}

export async function fetchFromApi<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}
