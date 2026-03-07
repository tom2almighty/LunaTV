import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GroupManagementPanel } from '@/app/admin/_components/user-config/group-management-panel';
import { UserListPanel } from '@/app/admin/_components/user-config/user-list-panel';
import { UserTablePanel } from '@/app/admin/_components/user-config/user-table-panel';

describe('admin panel shells', () => {
  it('renders premium list and table wrappers', () => {
    render(
      <>
        <UserListPanel title='用户配置'>内容</UserListPanel>
        <UserTablePanel>
          <div>表格</div>
        </UserTablePanel>
        <GroupManagementPanel header={<div>头部</div>} body={<div>主体</div>} />
      </>,
    );

    expect(screen.getByText('用户配置')).toBeVisible();
    expect(screen.getByText('表格').parentElement).toHaveClass(
      'rounded-[1.25rem]',
    );
    expect(screen.getByText('主体').parentElement).toHaveClass(
      'rounded-[1.25rem]',
    );
  });
});
