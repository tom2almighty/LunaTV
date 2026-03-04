'use client';

import { usePlayPlayerRuntime } from '@/app/play/hooks/use-play-player-runtime';

function PlayPageClient() {
  const runtime = usePlayPlayerRuntime();
  return runtime;
}

export default PlayPageClient;
