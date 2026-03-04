import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import {
  ApiBusinessError,
  ApiValidationError,
  executeApiHandler,
} from '@/server/api/handler';

describe('executeApiHandler', () => {
  it('returns 401 for unauthorized request when auth is required', async () => {
    const request = new NextRequest('http://localhost/api/user/favorites');

    const response = await executeApiHandler(
      request,
      async () => ({ ok: true }),
      { requireAuth: true },
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Unauthorized');
  });

  it('maps business errors to configured status/code/message', async () => {
    const request = new NextRequest('http://localhost/api/test');

    const response = await executeApiHandler(
      request,
      async () => {
        throw new ApiBusinessError('业务规则冲突', 409, 'BUSINESS_CONFLICT');
      },
      { requireAuth: false },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('BUSINESS_CONFLICT');
    expect(body.error.message).toBe('业务规则冲突');
  });

  it('maps validation errors to 400', async () => {
    const request = new NextRequest('http://localhost/api/test');

    const response = await executeApiHandler(
      request,
      async () => {
        throw new ApiValidationError('字段校验失败', { field: 'keyword' });
      },
      { requireAuth: false },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('字段校验失败');
    expect(body.error.details).toEqual({ field: 'keyword' });
  });

  it('maps unknown errors to 500', async () => {
    const request = new NextRequest('http://localhost/api/test');

    const response = await executeApiHandler(
      request,
      async () => {
        throw new Error('boom');
      },
      { requireAuth: false },
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('Internal Server Error');
  });
});
