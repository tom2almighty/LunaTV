import { useMemo } from 'react';

export function usePlaySourceSwitch() {
  return useMemo(
    () => ({
      canSwitchSource: true,
    }),
    [],
  );
}
