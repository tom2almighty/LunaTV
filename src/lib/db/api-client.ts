/* eslint-disable no-console */
'use client';

/**
 * 客户端 DB 辅助工具
 */

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
