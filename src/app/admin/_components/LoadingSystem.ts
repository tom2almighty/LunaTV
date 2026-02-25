'use client';

import { useState } from 'react';

export interface LoadingState {
  [key: string]: boolean;
}

export const useLoadingState = () => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }));
  };

  const isLoading = (key: string) => loadingStates[key] || false;

  const withLoading = async <T>(
    key: string,
    operation: () => Promise<T>,
  ): Promise<T> => {
    setLoading(key, true);
    try {
      return await operation();
    } finally {
      setLoading(key, false);
    }
  };

  return { loadingStates, setLoading, isLoading, withLoading };
};
