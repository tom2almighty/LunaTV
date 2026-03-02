import { describe, expect, it } from 'vitest';

import nextConfig from '../../../next.config.js';

describe('next config policy', () => {
  it('ensures image optimization remains disabled by config policy', () => {
    const typedConfig = nextConfig as {
      images?: {
        unoptimized?: boolean;
      };
    };

    expect(typedConfig.images?.unoptimized).toBe(true);
  });
});
