import { describe, expect, it } from 'vitest';

import { assertSafeOutgoingUrl } from '../url-guard';

describe('assertSafeOutgoingUrl', () => {
  it('rejects unsupported protocols', async () => {
    await expect(assertSafeOutgoingUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(
      assertSafeOutgoingUrl('ftp://example.com/test'),
    ).rejects.toThrow();
  });

  it('rejects localhost and private network IPs', async () => {
    await expect(
      assertSafeOutgoingUrl('http://localhost:3000'),
    ).rejects.toThrow();
    await expect(
      assertSafeOutgoingUrl('http://127.0.0.1/api'),
    ).rejects.toThrow();
    await expect(
      assertSafeOutgoingUrl('http://10.0.0.5/data'),
    ).rejects.toThrow();
    await expect(
      assertSafeOutgoingUrl('http://172.16.10.10/data'),
    ).rejects.toThrow();
    await expect(
      assertSafeOutgoingUrl('http://192.168.0.8/data'),
    ).rejects.toThrow();
  });

  it('allows whitelisted https domain with public resolved ip', async () => {
    await expect(
      assertSafeOutgoingUrl(
        'https://img3.doubanio.com/view/photo/s_ratio_poster/public/p123.webp',
        {
          allowedHosts: ['doubanio.com'],
          resolveHostname: async () => ['151.101.1.140'],
        },
      ),
    ).resolves.toBeInstanceOf(URL);
  });
});
