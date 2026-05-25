export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

export function parseStorageKey(key: string): { source: string; id: string } | null {
  const idx = key.indexOf('+');
  if (idx < 0) return null;
  return { source: key.slice(0, idx), id: key.slice(idx + 1) };
}
