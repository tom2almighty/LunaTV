import { describe, expect, it } from 'vitest';

import { config } from '@/proxy';

describe('proxy matcher', () => {
  it('does not guard public auth bootstrap endpoints', () => {
    const matcher = config.matcher[0];
    const regexp = new RegExp(`^${matcher}$`);

    expect(regexp.test('/api/auth/sessions')).toBe(false);
    expect(regexp.test('/api/public/site')).toBe(false);
    expect(regexp.test('/api/users')).toBe(false);
  });
});
