import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DataMigration from '@/components/DataMigration';

describe('DataMigration view', () => {
  it('renders premium migration panels and unified form controls', () => {
    render(<DataMigration />);

    expect(
      screen.getByText('数据导出').closest('div[class*="app-panel"]'),
    ).toHaveClass('app-panel');
    expect(screen.getByPlaceholderText('设置强密码保护备份文件')).toHaveClass(
      'app-control',
    );
    expect(
      screen.getByText('数据迁移操作请谨慎，确保已备份重要数据').parentElement,
    ).toHaveClass('rounded-[1.25rem]');
  });
});
