import { describe, expect, it } from 'vitest';

import { parseResourceIdentity } from '@/server/api/validation';

describe('parseResourceIdentity', () => {
  it('parses source + videoId path params', () => {
    expect(parseResourceIdentity('abc', '123')).toEqual({
      source: 'abc',
      videoId: '123',
    });
  });
});
