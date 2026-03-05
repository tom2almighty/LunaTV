import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAuthInfoFromCookie, getSessionMaxAgeMs } from '@/lib/auth';
import { getConfig } from '@/lib/config';

import { validateSiteSettingsPayload } from '@/app/api/admin/settings/site/route';
import { verifyAuthSignature } from '@/server/api/auth-verifier';
import {
  ApiAuthError,
  requireActiveUsername,
  requireAdminRoleByUsername,
} from '@/server/api/guards';

vi.mock('@/lib/auth', () => ({
  getAuthInfoFromCookie: vi.fn(),
  getSessionMaxAgeMs: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('@/server/api/auth-verifier', () => ({
  verifyAuthSignature: vi.fn(),
}));

const mockedGetAuthInfoFromCookie = vi.mocked(getAuthInfoFromCookie);
const mockedGetSessionMaxAgeMs = vi.mocked(getSessionMaxAgeMs);
const mockedVerifyAuthSignature = vi.mocked(verifyAuthSignature);
const mockedGetConfig = vi.mocked(getConfig);

describe('requireActiveUsername', () => {
  const request = new NextRequest('http://localhost/api/test');
  const previousAdminUsername = process.env.APP_ADMIN_USERNAME;
  const previousAdminPassword = process.env.APP_ADMIN_PASSWORD;
  const previousSessionMaxAge = process.env.SESSION_MAX_AGE_MS;

  beforeEach(() => {
    process.env.APP_ADMIN_USERNAME = 'owner';
    process.env.APP_ADMIN_PASSWORD = 'owner-password';
    process.env.SESSION_MAX_AGE_MS = String(7 * 24 * 60 * 60 * 1000);
    mockedGetAuthInfoFromCookie.mockReset();
    mockedGetSessionMaxAgeMs.mockReset();
    mockedVerifyAuthSignature.mockReset();
    mockedGetConfig.mockReset();
    mockedGetSessionMaxAgeMs.mockReturnValue(7 * 24 * 60 * 60 * 1000);
  });

  afterEach(() => {
    process.env.APP_ADMIN_USERNAME = previousAdminUsername;
    process.env.APP_ADMIN_PASSWORD = previousAdminPassword;
    process.env.SESSION_MAX_AGE_MS = previousSessionMaxAge;
  });

  it('returns owner when signature is valid', async () => {
    mockedGetAuthInfoFromCookie.mockReturnValue({
      username: 'owner',
      signature: 'valid-signature',
      timestamp: Date.now(),
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
      timestamp: Date.now(),
    });
    mockedVerifyAuthSignature.mockResolvedValue(false);

    await expect(requireActiveUsername(request)).rejects.toThrow(ApiAuthError);
  });

  it('rejects expired session timestamp', async () => {
    mockedGetSessionMaxAgeMs.mockReturnValue(1000);
    mockedGetAuthInfoFromCookie.mockReturnValue({
      username: 'owner',
      signature: 'valid-signature',
      timestamp: Date.now() - 2_000,
    });
    mockedVerifyAuthSignature.mockResolvedValue(true);

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
      timestamp: Date.now(),
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

describe('validateSiteSettingsPayload', () => {
  const validPayload = {
    SiteName: 'MoonTV',
    Announcement: '',
    SearchDownstreamMaxPage: 5,
    SiteInterfaceCacheTime: 7200,
    DoubanDataCacheTime: 7200,
    DoubanDataProxyMode: 'server',
    DoubanDataProxyPresetId: '',
    DoubanDataProxyCustomUrl: '',
    DoubanDataProxyPresets: [
      { id: 'data-a', name: 'Data A', url: 'https://a/?url=' },
    ],
    DoubanImageProxyMode: 'server',
    DoubanImageProxyPresetId: '',
    DoubanImageProxyCustomUrl: '',
    DoubanImageProxyPresets: [
      { id: 'img-a', name: 'Img A', url: 'https://img-a/?url=' },
    ],
    DisableYellowFilter: false,
    FluidSearch: true,
    EnableRegistration: false,
    M3U8AdFilterEnabled: true,
  } as const;

  it('rejects invalid mode and invalid preset url', () => {
    expect(() =>
      validateSiteSettingsPayload({
        ...validPayload,
        DoubanDataProxyMode: 'invalid-mode',
      }),
    ).toThrow('参数格式错误');

    expect(() =>
      validateSiteSettingsPayload({
        ...validPayload,
        DoubanDataProxyPresets: [
          { id: 'data-a', name: 'Data A', url: 'not-a-http-url' },
        ],
      }),
    ).toThrow('参数格式错误');
  });

  it('rejects duplicate preset ids per pool', () => {
    expect(() =>
      validateSiteSettingsPayload({
        ...validPayload,
        DoubanImageProxyPresets: [
          { id: 'dup', name: 'A', url: 'https://a/?url=' },
          { id: 'dup', name: 'B', url: 'https://b/?url=' },
        ],
      }),
    ).toThrow('参数格式错误');
  });
});
