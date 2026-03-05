import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { ApiValidationError, executeApiHandler } from '@/server/api/handler';

describe('api response contract', () => {
  it('returns standard success envelope by default', async () => {
    const request = new NextRequest('http://localhost/api/test');

    const response = await executeApiHandler(
      request,
      async () => ({ id: '1', name: 'demo' }),
      { requireAuth: false },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { id: '1', name: 'demo' },
    });
  });

  it('returns standard error envelope by default', async () => {
    const request = new NextRequest('http://localhost/api/test');

    const response = await executeApiHandler(
      request,
      async () => {
        throw new ApiValidationError('bad request', { field: 'keyword' });
      },
      { requireAuth: false },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'bad request',
        details: { field: 'keyword' },
      },
    });
  });

  it('returns raw payload when responseShape is raw', async () => {
    const request = new NextRequest('http://localhost/api/test');

    const response = await executeApiHandler(
      request,
      async () => ({ id: '1', name: 'raw' }),
      { requireAuth: false, responseShape: 'raw' },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: '1', name: 'raw' });
  });

  it('returns raw error payload when responseShape is raw', async () => {
    const request = new NextRequest('http://localhost/api/test');

    const response = await executeApiHandler(
      request,
      async () => {
        throw new ApiValidationError('invalid resource identity');
      },
      { requireAuth: false, responseShape: 'raw' },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid resource identity',
    });
  });
});
