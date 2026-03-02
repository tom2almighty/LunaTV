'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import { getSearchHistory, subscribeToDataUpdates } from '@/lib/db';

type UseSearchPageInitParams = {
  hasQuery: boolean;
  setUseFluidSearch: Dispatch<SetStateAction<boolean>>;
};

function parseBooleanSetting(value: string | null): boolean | null {
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value) as boolean;
  } catch {
    return null;
  }
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

    if (typeof window !== 'undefined') {
      const savedFluidSearch = parseBooleanSetting(
        localStorage.getItem('fluidSearch'),
      );
      const defaultFluidSearch = (
        window as Window & { RUNTIME_CONFIG?: { FLUID_SEARCH?: boolean } }
      ).RUNTIME_CONFIG?.FLUID_SEARCH;
      if (savedFluidSearch !== null) {
        setUseFluidSearch(savedFluidSearch);
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
