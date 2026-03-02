import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const filesToCheck = [
  'src/lib/db/favorites.ts',
  'src/lib/db/play-records.ts',
  'src/lib/db/search-history.ts',
  'src/lib/db/skip-configs.ts',
  'src/lib/db/index.ts',
];

const oldPaths = [
  '/api/favorites',
  '/api/playrecords',
  '/api/searchhistory',
  '/api/skipconfigs',
];

const newPaths = [
  '/api/user/favorites',
  '/api/user/play-records',
  '/api/user/search-history',
  '/api/user/skip-configs',
];

describe('api routes', () => {
  it('uses RESTful user routes in db client modules', () => {
    const content = filesToCheck
      .map((filePath) => readFileSync(filePath, 'utf8'))
      .join('\n');

    for (const oldPath of oldPaths) {
      expect(content.includes(oldPath)).toBe(false);
    }

    for (const newPath of newPaths) {
      expect(content.includes(newPath)).toBe(true);
    }
  });
});
