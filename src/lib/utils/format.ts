export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function progressPct(current: number, total: number): number {
  if (!total || total <= 0) return 0;
  return clamp((current / total) * 100, 0, 100);
}

export function formatEpisodeLabel(index: number, total: number, current?: number): string {
  if (current && total > 1) return `${current}/${total}`;
  if (total > 1) return `${total}集`;
  return String(index);
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
