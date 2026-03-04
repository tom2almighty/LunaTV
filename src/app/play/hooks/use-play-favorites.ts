import { useMemo } from 'react';

export function usePlayFavorites() {
  return useMemo(
    () => ({
      canToggleFavorite: true,
    }),
    [],
  );
}
