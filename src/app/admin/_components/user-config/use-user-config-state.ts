import { useMemo, useState } from 'react';

import type { AdminConfig } from '@/lib/admin.types';

type UserRole = 'owner' | 'admin' | null;

type UserConfigStateParams = {
  config: AdminConfig | null;
  role: UserRole;
  currentUsername: string | null;
};

export function useUserConfigState({
  config,
  role,
  currentUsername,
}: UserConfigStateParams) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const selectableUserCount = useMemo(() => {
    return (
      config?.UserConfig?.Users?.filter(
        (user) =>
          role === 'owner' ||
          (role === 'admin' &&
            (user.role === 'user' || user.username === currentUsername)),
      ).length || 0
    );
  }, [config?.UserConfig?.Users, role, currentUsername]);

  const selectAllUsers =
    selectedUsers.size === selectableUserCount && selectedUsers.size > 0;

  return {
    selectedUsers,
    setSelectedUsers,
    selectableUserCount,
    selectAllUsers,
  };
}
