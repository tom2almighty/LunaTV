'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import { getSearchHistory, subscribeToDataUpdates } from '@/lib/db';

type UseSearchPageInitParams = {
  hasQuery: boolean;
  setUseFluidSearch: Dispatch<SetStateAction<boolean>>;
};

function getRuntimeFluidSearchDefault(): boolean | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const defaultFluidSearch = (
    window as Window & { RUNTIME_CONFIG?: { FLUID_SEARCH?: boolean } }
  ).RUNTIME_CONFIG?.FLUID_SEARCH;

  if (defaultFluidSearch === undefined) {
    return null;
  }

  return defaultFluidSearch !== false;
}

export function useSearchPageInit({
  hasQuery,
  setUseFluidSearch,
}: UseSearchPageInitParams) {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!hasQuery) {
      document.getElementById('searchInput')?.focus();
    }

    getSearchHistory().then(setSearchHistory);

    const runtimeFluidSearch = getRuntimeFluidSearchDefault();
    if (runtimeFluidSearch !== null) {
      setUseFluidSearch(runtimeFluidSearch);
    }

    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [hasQuery, setUseFluidSearch]);

  return { searchHistory };
}
