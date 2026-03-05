import { describe, expect, it } from 'vitest';

import {
  hashPassword,
  isLegacyPlaintextPassword,
  verifyPassword,
} from '../password';

describe('password security', () => {
  it('hashPassword should not store plain text', () => {
    const plain = 'super-secret-password';
    const hashed = hashPassword(plain);

    expect(hashed).not.toBe(plain);
    expect(hashed.startsWith('v1$')).toBe(true);
  });

  it('verifyPassword should validate correct and incorrect password', () => {
    const hashed = hashPassword('correct-password');

    expect(verifyPassword('correct-password', hashed)).toBe(true);
    expect(verifyPassword('wrong-password', hashed)).toBe(false);
  });

  it('isLegacyPlaintextPassword should identify legacy plain text format', () => {
    const hashed = hashPassword('plain-to-hash');

    expect(isLegacyPlaintextPassword('legacy-plain')).toBe(true);
    expect(isLegacyPlaintextPassword(hashed)).toBe(false);
  });
});
