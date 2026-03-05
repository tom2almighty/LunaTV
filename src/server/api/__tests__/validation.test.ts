import { describe, expect, it } from 'vitest';

import { parseResourceIdentity } from '@/server/api/validation';

describe('parseResourceIdentity', () => {
  it('parses source + videoId path params', () => {
    expect(parseResourceIdentity('abc', '123')).toEqual({
      source: 'abc',
      videoId: '123',
    });
  });

  it('throws for empty source or videoId', () => {
    expect(() => parseResourceIdentity('', '123')).toThrow(
      'Invalid resource identity',
    );
    expect(() => parseResourceIdentity('abc', '')).toThrow(
      'Invalid resource identity',
    );
  });
});
