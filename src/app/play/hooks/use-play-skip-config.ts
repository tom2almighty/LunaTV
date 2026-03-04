import { useMemo } from 'react';

export function usePlaySkipConfig() {
  return useMemo(
    () => ({
      skipConfigEnabled: true,
    }),
    [],
  );
}
