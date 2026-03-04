import { type ReactNode, createElement, useMemo } from 'react';

import { PlayPlayerRuntime } from '@/app/play/components/play-player-runtime';

import { usePlayFavorites } from './use-play-favorites';
import { usePlayKeyboardShortcuts } from './use-play-keyboard-shortcuts';
import { usePlaySkipConfig } from './use-play-skip-config';
import { usePlaySourceSwitch } from './use-play-source-switch';

export function usePlayPlayerRuntime() {
  // Keep hook composition centralized while PlayPageClient stays thin.
  usePlayKeyboardShortcuts({ enabled: true });
  usePlayFavorites();
  usePlaySkipConfig();
  usePlaySourceSwitch();

  return useMemo<ReactNode>(() => createElement(PlayPlayerRuntime), []);
}
