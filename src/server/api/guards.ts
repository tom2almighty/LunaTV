import { NextRequest } from 'next/server';

import { AdminConfig } from '@/lib/admin.types';
import { getAuthInfoFromCookie, getSessionMaxAgeMs } from '@/lib/auth';
import { getConfig } from '@/lib/config';

import { verifyAuthSignature } from '@/server/api/auth-verifier';

export class ApiAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'ApiAuthError';
    this.status = status;
  }
}

export async function requireActiveUsername(
  request: NextRequest,
): Promise<string> {
  const authInfo = getAuthInfoFromCookie(request);
  const username = authInfo?.username?.trim();
  const signature = authInfo?.signature?.trim();
  const timestamp = authInfo?.timestamp;
  if (!username || !signature || typeof timestamp !== 'number') {
    throw new ApiAuthError('Unauthorized', 401);
  }

  if (!Number.isFinite(timestamp)) {
    throw new ApiAuthError('Unauthorized', 401);
  }

  const sessionMaxAgeMs = getSessionMaxAgeMs();
  if (Date.now() - timestamp > sessionMaxAgeMs) {
    throw new ApiAuthError('Session expired', 401);
  }

  const adminPassword = process.env.APP_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new ApiAuthError('Unauthorized', 401);
  }

  const isValidSignature = await verifyAuthSignature(
    username,
    signature,
    adminPassword,
  );
  if (!isValidSignature) {
    throw new ApiAuthError('Unauthorized', 401);
  }

  if (username === process.env.APP_ADMIN_USERNAME) {
    return username;
  }

  const config = await getConfig();
  const user = config.UserConfig.Users.find(
    (item) => item.username === username,
  );
  if (!user) {
    throw new ApiAuthError('用户不存在', 401);
  }

  if (user.banned) {
    throw new ApiAuthError('用户已被封禁', 401);
  }

  return username;
}

export type SessionRole = 'owner' | 'admin' | 'user';

export async function resolveSessionRoleByUsername(
  username: string,
): Promise<SessionRole> {
  if (username === process.env.APP_ADMIN_USERNAME) {
    return 'owner';
  }

  const config = await getConfig();
  const user = config.UserConfig.Users.find(
    (item) => item.username === username && !item.banned,
  );
  if (!user) {
    throw new ApiAuthError('用户不存在', 401);
  }

  if (user.role === 'admin') {
    return 'admin';
  }

  return 'user';
}

export type AdminRole = 'owner' | 'admin';

export function resolveAdminRole(
  config: AdminConfig,
  username: string,
): AdminRole | null {
  if (username === process.env.APP_ADMIN_USERNAME) {
    return 'owner';
  }

  const user = config.UserConfig.Users.find(
    (item) => item.username === username,
  );
  if (!user || user.role !== 'admin' || user.banned) {
    return null;
  }

  return 'admin';
}

export async function requireAdminRoleByUsername(
  username: string,
  options?: {
    ownerOnly?: boolean;
    forbiddenMessage?: string;
    ownerOnlyMessage?: string;
  },
): Promise<AdminRole> {
  const config = await getConfig();
  const role = resolveAdminRole(config, username);
  if (!role) {
    throw new ApiAuthError(options?.forbiddenMessage || '权限不足', 401);
  }
  if (options?.ownerOnly && role !== 'owner') {
    throw new ApiAuthError(options.ownerOnlyMessage || '权限不足', 401);
  }
  return role;
}
