/* eslint-disable @typescript-eslint/no-explicit-any */

import { getConfig } from '@/lib/config';
import {
  changePassword,
  deleteUser,
  registerUser,
  saveAdminConfig,
} from '@/lib/db.server';

type OperatorRole = 'owner' | 'admin';

export const ADMIN_USER_ACTIONS = [
  'add',
  'ban',
  'unban',
  'setAdmin',
  'cancelAdmin',
  'changePassword',
  'deleteUser',
  'updateUserApis',
  'userGroup',
  'updateUserGroups',
  'batchUpdateUserGroups',
] as const;

export type AdminUserAction = (typeof ADMIN_USER_ACTIONS)[number];

type GroupAction = 'add' | 'edit' | 'delete';

export type AdminUserActionPayload = {
  action: AdminUserAction;
  targetUsername?: string;
  targetPassword?: string;
  userGroup?: string;
  enabledApis?: string[];
  userGroups?: string[];
  usernames?: string[];
  groupAction?: GroupAction;
  groupName?: string;
};

export class AdminUserServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function fail(status: number, message: string): never {
  throw new AdminUserServiceError(status, message);
}

async function resolveOperatorContext(operatorUsername: string) {
  const adminConfig = await getConfig();

  if (operatorUsername === process.env.APP_ADMIN_USERNAME) {
    return { adminConfig, operatorRole: 'owner' as OperatorRole };
  }

  const operatorEntry = adminConfig.UserConfig.Users.find(
    (u) => u.username === operatorUsername,
  );
  if (
    !operatorEntry ||
    operatorEntry.role !== 'admin' ||
    operatorEntry.banned
  ) {
    fail(401, '权限不足');
  }

  return { adminConfig, operatorRole: 'admin' as OperatorRole };
}

function getTargetEntry(adminConfig: any, targetUsername: string) {
  return adminConfig.UserConfig.Users.find(
    (u: any) => u.username === targetUsername,
  );
}

function ensureTagsConfig(adminConfig: any) {
  if (!adminConfig.UserConfig.Tags) {
    adminConfig.UserConfig.Tags = [];
  }
}

function validateTargetForAction(
  action: AdminUserAction,
  targetUsername?: string,
) {
  if (
    !targetUsername &&
    !['userGroup', 'batchUpdateUserGroups'].includes(action)
  ) {
    fail(400, '缺少目标用户名');
  }
}

export async function executeAdminUserAction(
  operatorUsername: string,
  payload: AdminUserActionPayload,
) {
  const { action, targetUsername, targetPassword } = payload;

  if (!action || !ADMIN_USER_ACTIONS.includes(action)) {
    fail(400, '参数格式错误');
  }

  validateTargetForAction(action, targetUsername);

  if (
    action !== 'changePassword' &&
    action !== 'deleteUser' &&
    action !== 'updateUserApis' &&
    action !== 'userGroup' &&
    action !== 'updateUserGroups' &&
    action !== 'batchUpdateUserGroups' &&
    operatorUsername === targetUsername
  ) {
    fail(400, '无法对自己进行此操作');
  }

  const { adminConfig, operatorRole } =
    await resolveOperatorContext(operatorUsername);

  let targetEntry: any = null;
  let isTargetAdmin = false;

  if (
    !['userGroup', 'batchUpdateUserGroups'].includes(action) &&
    targetUsername
  ) {
    targetEntry = getTargetEntry(adminConfig, targetUsername);

    if (
      targetEntry &&
      targetEntry.role === 'owner' &&
      !['changePassword', 'updateUserApis', 'updateUserGroups'].includes(action)
    ) {
      fail(400, '无法操作站长');
    }

    isTargetAdmin = targetEntry?.role === 'admin';
  }

  switch (action) {
    case 'add': {
      if (targetEntry) {
        fail(400, '用户已存在');
      }
      if (!targetPassword) {
        fail(400, '缺少目标用户密码');
      }

      await registerUser(targetUsername!, targetPassword);
      const newUser: any = {
        username: targetUsername!,
        role: 'user',
      };
      if (payload.userGroup && payload.userGroup.trim()) {
        newUser.tags = [payload.userGroup];
      }
      adminConfig.UserConfig.Users.push(newUser);
      break;
    }
    case 'ban': {
      if (!targetEntry) fail(404, '目标用户不存在');
      if (isTargetAdmin && operatorRole !== 'owner') {
        fail(401, '仅站长可封禁管理员');
      }
      targetEntry.banned = true;
      break;
    }
    case 'unban': {
      if (!targetEntry) fail(404, '目标用户不存在');
      if (isTargetAdmin && operatorRole !== 'owner') {
        fail(401, '仅站长可操作管理员');
      }
      targetEntry.banned = false;
      break;
    }
    case 'setAdmin': {
      if (!targetEntry) fail(404, '目标用户不存在');
      if (targetEntry.role === 'admin') fail(400, '该用户已是管理员');
      if (operatorRole !== 'owner') fail(401, '仅站长可设置管理员');
      targetEntry.role = 'admin';
      break;
    }
    case 'cancelAdmin': {
      if (!targetEntry) fail(404, '目标用户不存在');
      if (targetEntry.role !== 'admin') fail(400, '目标用户不是管理员');
      if (operatorRole !== 'owner') fail(401, '仅站长可取消管理员');
      targetEntry.role = 'user';
      break;
    }
    case 'changePassword': {
      if (!targetEntry) fail(404, '目标用户不存在');
      if (!targetPassword) fail(400, '缺少新密码');
      if (targetEntry.role === 'owner') fail(401, '无法修改站长密码');
      if (
        isTargetAdmin &&
        operatorRole !== 'owner' &&
        operatorUsername !== targetUsername
      ) {
        fail(401, '仅站长可修改其他管理员密码');
      }
      await changePassword(targetUsername!, targetPassword);
      break;
    }
    case 'deleteUser': {
      if (!targetEntry) fail(404, '目标用户不存在');
      if (operatorUsername === targetUsername) fail(400, '不能删除自己');
      if (isTargetAdmin && operatorRole !== 'owner') {
        fail(401, '仅站长可删除管理员');
      }
      await deleteUser(targetUsername!);
      const userIndex = adminConfig.UserConfig.Users.findIndex(
        (u: any) => u.username === targetUsername,
      );
      if (userIndex > -1) {
        adminConfig.UserConfig.Users.splice(userIndex, 1);
      }
      break;
    }
    case 'updateUserApis': {
      if (!targetEntry) fail(404, '目标用户不存在');
      if (
        isTargetAdmin &&
        operatorRole !== 'owner' &&
        operatorUsername !== targetUsername
      ) {
        fail(401, '仅站长可配置其他管理员的采集源');
      }
      if (payload.enabledApis && payload.enabledApis.length > 0) {
        targetEntry.enabledApis = payload.enabledApis;
      } else {
        delete targetEntry.enabledApis;
      }
      break;
    }
    case 'userGroup': {
      const groupAction = payload.groupAction;
      const groupName = payload.groupName;
      if (!groupAction || !groupName) {
        fail(400, '缺少用户组操作参数');
      }

      ensureTagsConfig(adminConfig);
      const tags = adminConfig.UserConfig.Tags!;

      if (groupAction === 'add') {
        if (tags.find((t: any) => t.name === groupName)) {
          fail(400, '用户组已存在');
        }
        tags.push({
          name: groupName,
          enabledApis: payload.enabledApis || [],
        });
      } else if (groupAction === 'edit') {
        const groupIndex = tags.findIndex((t: any) => t.name === groupName);
        if (groupIndex === -1) fail(404, '用户组不存在');
        tags[groupIndex].enabledApis = payload.enabledApis || [];
      } else if (groupAction === 'delete') {
        const groupIndex = tags.findIndex((t: any) => t.name === groupName);
        if (groupIndex === -1) fail(404, '用户组不存在');

        adminConfig.UserConfig.Users.forEach((user: any) => {
          if (user.tags && user.tags.includes(groupName)) {
            user.tags = user.tags.filter((tag: string) => tag !== groupName);
            if (user.tags.length === 0) {
              delete user.tags;
            }
          }
        });

        tags.splice(groupIndex, 1);
      } else {
        fail(400, '未知的用户组操作');
      }
      break;
    }
    case 'updateUserGroups': {
      if (!targetEntry) fail(404, '目标用户不存在');
      if (
        isTargetAdmin &&
        operatorRole !== 'owner' &&
        operatorUsername !== targetUsername
      ) {
        fail(400, '仅站长可配置其他管理员的用户组');
      }

      if (payload.userGroups && payload.userGroups.length > 0) {
        targetEntry.tags = payload.userGroups;
      } else {
        delete targetEntry.tags;
      }
      break;
    }
    case 'batchUpdateUserGroups': {
      if (!payload.usernames || payload.usernames.length === 0) {
        fail(400, '缺少用户名列表');
      }

      if (operatorRole !== 'owner') {
        for (const username of payload.usernames) {
          const targetUser = getTargetEntry(adminConfig, username);
          if (
            targetUser &&
            targetUser.role === 'admin' &&
            username !== operatorUsername
          ) {
            fail(400, `管理员无法操作其他管理员 ${username}`);
          }
        }
      }

      for (const username of payload.usernames) {
        const targetUser = getTargetEntry(adminConfig, username);
        if (!targetUser) continue;
        if (payload.userGroups && payload.userGroups.length > 0) {
          targetUser.tags = payload.userGroups;
        } else {
          delete targetUser.tags;
        }
      }
      break;
    }
    default:
      fail(400, '未知操作');
  }

  await saveAdminConfig(adminConfig);
}

export async function getUserGroupsForOperator(operatorUsername: string) {
  const { adminConfig } = await resolveOperatorContext(operatorUsername);
  return adminConfig.UserConfig.Tags || [];
}
