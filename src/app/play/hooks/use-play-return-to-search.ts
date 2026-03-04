'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function buildReturnSearchUrl(title: string) {
  return `/search?q=${encodeURIComponent(title)}&restore=1`;
}

export function usePlayReturnToSearch(searchTitle: string, videoTitle: string) {
  const router = useRouter();

  return useCallback(() => {
    const query = (searchTitle || videoTitle || '').trim();
    if (!query) {
      router.back();
      return;
    }
    router.push(buildReturnSearchUrl(query));
  }, [router, searchTitle, videoTitle]);
}
