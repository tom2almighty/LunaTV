export function parseResourceIdentity(source?: string, videoId?: string) {
  const s = String(source || '').trim();
  const v = String(videoId || '').trim();
  if (!s || !v) {
    throw new Error('Invalid resource identity');
  }

  return { source: s, videoId: v };
}
