'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import { getSearchHistory, subscribeToDataUpdates } from '@/lib/db';

type UseSearchPageInitParams = {
  hasQuery: boolean;
  setUseFluidSearch: Dispatch<SetStateAction<boolean>>;
};

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

    if (typeof window !== 'undefined') {
      const savedFluidSearch = localStorage.getItem('fluidSearch');
      const defaultFluidSearch = (
        window as Window & { RUNTIME_CONFIG?: { FLUID_SEARCH?: boolean } }
      ).RUNTIME_CONFIG?.FLUID_SEARCH;
      if (savedFluidSearch !== null) {
        setUseFluidSearch(JSON.parse(savedFluidSearch));
      } else if (defaultFluidSearch !== undefined) {
        setUseFluidSearch(defaultFluidSearch !== false);
      }
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
