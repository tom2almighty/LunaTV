import { ReactNode } from 'react';

import { UserListPanel } from './user-list-panel';

type UserConfigContainerProps = {
  children: ReactNode;
};

export function UserConfigContainer({ children }: UserConfigContainerProps) {
  return <UserListPanel title='用户配置'>{children}</UserListPanel>;
}
