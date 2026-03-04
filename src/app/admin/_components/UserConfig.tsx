'use client';

import {
  type UserConfigShellProps,
  UserConfigShell,
} from './user-config/user-config-shell';

export type UserConfigProps = UserConfigShellProps;

export const UserConfig = (props: UserConfigProps) => {
  return <UserConfigShell {...props} />;
};
