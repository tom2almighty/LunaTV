import {
  deletePlayRecord,
  generateStorageKey,
  getAllPlayRecords,
  savePlayRecord,
} from '@/lib/db';

type ResumeProgress = {
  targetIndex: number;
  targetTime: number;
};

type SavePlayProgressInput = {
  source: string;
  id: string;
  title: string;
  sourceName: string;
  year?: string;
  cover: string;
  episodeIndex: number;
  totalEpisodes: number;
  currentTime: number;
  duration: number;
  searchTitle?: string;
};

export async function loadResumeProgress(
  source: string,
  id: string,
): Promise<ResumeProgress | null> {
  const allRecords = await getAllPlayRecords();
  const key = generateStorageKey(source, id);
  const record = allRecords[key];

  if (!record) return null;

  return {
    targetIndex: record.index - 1,
    targetTime: record.play_time,
  };
}

export async function persistPlayProgress(
  input: SavePlayProgressInput,
): Promise<void> {
  if (
    !input.source ||
    !input.id ||
    !input.title ||
    !input.sourceName ||
    input.currentTime < 1 ||
    !input.duration
  ) {
    return;
  }

  await savePlayRecord(input.source, input.id, {
    title: input.title,
    source_name: input.sourceName,
    year: input.year,
    cover: input.cover,
    index: input.episodeIndex + 1,
    total_episodes: input.totalEpisodes,
    play_time: Math.floor(input.currentTime),
    total_time: Math.floor(input.duration),
    save_time: Date.now(),
    search_title: input.searchTitle,
  });
}

export async function clearPlayProgressForVideo(
  source: string,
  id: string,
): Promise<void> {
  if (!source || !id) return;
  await deletePlayRecord(source, id);
}
