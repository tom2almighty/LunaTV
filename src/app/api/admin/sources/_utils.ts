import { AdminConfig } from '@/lib/admin.types';
import { getConfig } from '@/lib/config';
import { saveAdminConfig } from '@/lib/db.server';

import { requireAdminRoleByUsername } from '@/server/api/guards';
import { ApiBusinessError } from '@/server/api/handler';

export class AdminSourceApiError extends ApiBusinessError {
  constructor(message: string, status: number) {
    super(message, status, 'ADMIN_SOURCE_ERROR');
    this.name = 'AdminSourceApiError';
  }
}

export async function requireSourceAdminConfig(
  username: string,
): Promise<AdminConfig> {
  await requireAdminRoleByUsername(username);
  return getConfig();
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
