import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

import { verifyAuthSignature } from '@/server/api/auth-verifier';
import {
  ApiAuthError,
  requireActiveUsername,
  requireAdminRoleByUsername,
} from '@/server/api/guards';

vi.mock('@/lib/auth', () => ({
  getAuthInfoFromCookie: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('@/server/api/auth-verifier', () => ({
  verifyAuthSignature: vi.fn(),
}));

const mockedGetAuthInfoFromCookie = vi.mocked(getAuthInfoFromCookie);
const mockedVerifyAuthSignature = vi.mocked(verifyAuthSignature);
const mockedGetConfig = vi.mocked(getConfig);

describe('requireActiveUsername', () => {
  const request = new NextRequest('http://localhost/api/test');
  const previousAdminUsername = process.env.APP_ADMIN_USERNAME;
  const previousAdminPassword = process.env.APP_ADMIN_PASSWORD;

  beforeEach(() => {
    process.env.APP_ADMIN_USERNAME = 'owner';
    process.env.APP_ADMIN_PASSWORD = 'owner-password';
    mockedGetAuthInfoFromCookie.mockReset();
    mockedVerifyAuthSignature.mockReset();
    mockedGetConfig.mockReset();
  });

  afterEach(() => {
    process.env.APP_ADMIN_USERNAME = previousAdminUsername;
    process.env.APP_ADMIN_PASSWORD = previousAdminPassword;
  });

  it('returns owner when signature is valid', async () => {
    mockedGetAuthInfoFromCookie.mockReturnValue({
      username: 'owner',
      signature: 'valid-signature',
    });
    mockedVerifyAuthSignature.mockResolvedValue(true);

    await expect(requireActiveUsername(request)).resolves.toBe('owner');
    expect(mockedVerifyAuthSignature).toHaveBeenCalledWith(
      'owner',
      'valid-signature',
      'owner-password',
    );
    expect(mockedGetConfig).not.toHaveBeenCalled();
  });

  it('rejects tampered signature', async () => {
    mockedGetAuthInfoFromCookie.mockReturnValue({
      username: 'alice',
      signature: 'tampered-signature',
    });
    mockedVerifyAuthSignature.mockResolvedValue(false);

    await expect(requireActiveUsername(request)).rejects.toThrow(ApiAuthError);
  });

  it('rejects auth cookie when signature is missing', async () => {
    mockedGetAuthInfoFromCookie.mockReturnValue({ username: 'alice' });

    await expect(requireActiveUsername(request)).rejects.toThrow(
      'Unauthorized',
    );
    expect(mockedVerifyAuthSignature).not.toHaveBeenCalled();
  });

  it('rejects banned user even with valid signature', async () => {
    mockedGetAuthInfoFromCookie.mockReturnValue({
      username: 'alice',
      signature: 'valid-signature',
    });
    mockedVerifyAuthSignature.mockResolvedValue(true);
    mockedGetConfig.mockResolvedValue({
      UserConfig: {
        Users: [{ username: 'alice', role: 'user', banned: true }],
      },
    } as never);

    await expect(requireActiveUsername(request)).rejects.toThrow(
      '用户已被封禁',
    );
  });
});

describe('requireAdminRoleByUsername', () => {
  const previousAdminUsername = process.env.APP_ADMIN_USERNAME;

  beforeEach(() => {
    process.env.APP_ADMIN_USERNAME = 'owner';
    mockedGetConfig.mockReset();
  });

  afterEach(() => {
    process.env.APP_ADMIN_USERNAME = previousAdminUsername;
  });

  it('returns owner for configured owner username', async () => {
    mockedGetConfig.mockResolvedValue({ UserConfig: { Users: [] } } as never);

    await expect(requireAdminRoleByUsername('owner')).resolves.toBe('owner');
  });

  it('rejects non-admin users', async () => {
    mockedGetConfig.mockResolvedValue({
      UserConfig: {
        Users: [{ username: 'alice', role: 'user', banned: false }],
      },
    } as never);

    await expect(requireAdminRoleByUsername('alice')).rejects.toThrow(
      '权限不足',
    );
  });
});
