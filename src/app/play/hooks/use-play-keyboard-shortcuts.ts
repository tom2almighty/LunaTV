import { useEffect } from 'react';

type UsePlayKeyboardShortcutsParams = {
  enabled: boolean;
};

export function usePlayKeyboardShortcuts({
  enabled,
}: UsePlayKeyboardShortcutsParams) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const noop = () => {};
    window.addEventListener('play-keyboard-shortcuts-ready', noop);
    return () => {
      window.removeEventListener('play-keyboard-shortcuts-ready', noop);
    };
  }, [enabled]);
}
