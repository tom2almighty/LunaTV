import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('play query contract', () => {
  it('uses only ps query parameter for play session', () => {
    const url = '/play?ps=abc123';
    expect(url.includes('source=')).toBe(false);
    expect(url.includes('stitle=')).toBe(false);

    const playPageClient = readFileSync(
      'src/app/play/PlayPageClient.tsx',
      'utf8',
    );
    const bootstrapHook = readFileSync(
      'src/hooks/usePlaySessionBootstrap.ts',
      'utf8',
    );

    expect(playPageClient.includes("get('source')")).toBe(false);
    expect(playPageClient.includes("get('stitle')")).toBe(false);
    expect(playPageClient.includes("get('id')")).toBe(false);

    expect(bootstrapHook.includes('fallbackSource')).toBe(false);
    expect(bootstrapHook.includes('fallbackId')).toBe(false);
    expect(bootstrapHook.includes('fallbackSearchTitle')).toBe(false);
  });
});
