import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/cron/route';

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn().mockResolvedValue({
    ConfigSubscribtion: {
      URL: '',
      AutoUpdate: false,
    },
  }),
  refineConfig: vi.fn((value) => value),
}));

vi.mock('@/lib/db.server', () => ({
  getAllUsers: vi.fn().mockResolvedValue([]),
  getAllPlayRecords: vi.fn().mockResolvedValue({}),
  getAllFavorites: vi.fn().mockResolvedValue({}),
  cleanExpiredDoubanCache: vi.fn().mockResolvedValue(0),
}));

vi.mock('@/lib/fetchVideoDetail', () => ({
  fetchVideoDetail: vi.fn().mockResolvedValue(null),
}));

describe('/api/cron token guard', () => {
  const previousCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-test-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = previousCronSecret;
  });

  it('returns 401 when token is missing', async () => {
    const request = new NextRequest('http://localhost/api/cron');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const request = new NextRequest('http://localhost/api/cron', {
      headers: {
        'x-cron-secret': 'invalid-secret',
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns 200 when token is valid', async () => {
    const request = new NextRequest('http://localhost/api/cron', {
      headers: {
        'x-cron-secret': 'cron-test-secret',
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
