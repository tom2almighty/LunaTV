import { deleteSkipConfig, getSkipConfig, saveSkipConfig } from '@/lib/db';

export type SkipConfigValue = {
  enable: boolean;
  intro_time: number;
  outro_time: number;
};

export function isSkipConfigEmpty(config: SkipConfigValue): boolean {
  return !config.enable && !config.intro_time && !config.outro_time;
}

export function formatSkipDuration(seconds: number): string {
  if (seconds === 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (hours === 0) {
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export async function loadSkipConfigForVideo(
  source: string,
  id: string,
): Promise<SkipConfigValue | null> {
  if (!source || !id) return null;
  return getSkipConfig(source, id);
}

export async function persistSkipConfigForVideo(
  source: string,
  id: string,
  config: SkipConfigValue,
): Promise<void> {
  if (!source || !id) return;
  if (isSkipConfigEmpty(config)) {
    await deleteSkipConfig(source, id);
    return;
  }
  await saveSkipConfig(source, id, config);
}

export async function transferSkipConfigOnSourceSwitch(
  prevSource: string,
  prevId: string,
  nextSource: string,
  nextId: string,
  config: SkipConfigValue,
): Promise<void> {
  if (prevSource && prevId) {
    await deleteSkipConfig(prevSource, prevId);
  }

  if (nextSource && nextId) {
    await saveSkipConfig(nextSource, nextId, config);
  }
}
