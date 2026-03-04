import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('legacy endpoint cleanup', () => {
  it('removes Orion compatibility endpoints', () => {
    expect(existsSync('src/app/api/search/one/route.ts')).toBe(false);
    expect(existsSync('src/app/api/search/resources/route.ts')).toBe(false);
  });

  it('removes legacy composite-key helpers and assumptions', () => {
    const content = [
      readFileSync('src/lib/db.server.ts', 'utf8'),
      readFileSync('src/lib/db/api-client.ts', 'utf8'),
      readFileSync('src/app/api/cron/route.ts', 'utf8'),
      readFileSync('README.md', 'utf8'),
    ].join('\n');

    expect(content.includes('source+id')).toBe(false);
    expect(content.includes('parseStorageKey(')).toBe(false);
  });
});
