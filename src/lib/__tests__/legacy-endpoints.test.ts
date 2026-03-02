import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('legacy endpoint cleanup', () => {
  it('removes Orion compatibility endpoints', () => {
    expect(existsSync('src/app/api/search/one/route.ts')).toBe(false);
    expect(existsSync('src/app/api/search/resources/route.ts')).toBe(false);
  });
});
