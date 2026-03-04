import { NextRequest } from 'next/server';

import { AdminConfig } from '@/lib/admin.types';
import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { saveAdminConfig } from '@/lib/db.server';

export class AdminSourceApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminSourceApiError';
    this.status = status;
  }
}

export async function requireSourceAdminConfig(
  request: NextRequest,
): Promise<AdminConfig> {
  const authInfo = getAuthInfoFromCookie(request);
  const username = authInfo?.username;
  if (!username) {
    throw new AdminSourceApiError('Unauthorized', 401);
  }

  const adminConfig = await getConfig();
  if (username !== process.env.APP_ADMIN_USERNAME) {
    const userEntry = adminConfig.UserConfig.Users.find(
      (item) => item.username === username,
    );
    if (!userEntry || userEntry.role !== 'admin' || userEntry.banned) {
      throw new AdminSourceApiError('权限不足', 401);
    }
  }

  return adminConfig;
}

export function cleanupSourcePermissions(
  adminConfig: AdminConfig,
  sourceKeys: string[],
): void {
  if (!sourceKeys.length) {
    return;
  }

  if (adminConfig.UserConfig.Tags) {
    adminConfig.UserConfig.Tags.forEach((tag) => {
      if (tag.enabledApis) {
        tag.enabledApis = tag.enabledApis.filter(
          (api) => !sourceKeys.includes(api),
        );
      }
    });
  }

  adminConfig.UserConfig.Users.forEach((user) => {
    if (user.enabledApis) {
      user.enabledApis = user.enabledApis.filter(
        (api) => !sourceKeys.includes(api),
      );
    }
  });
}

export async function persistAdminConfig(config: AdminConfig): Promise<void> {
  await saveAdminConfig(config);
}
