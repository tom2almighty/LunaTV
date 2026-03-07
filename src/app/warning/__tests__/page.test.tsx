import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import WarningPage from '@/app/warning/page';

describe('WarningPage view', () => {
  it('renders a premium warning shell with restrained alert blocks', () => {
    render(<WarningPage />);

    expect(
      screen
        .getByRole('heading', { name: '安全合规配置警告' })
        .closest('div[class*="app-panel"]'),
    ).toHaveClass('app-panel');
    expect(screen.getByText('🔒 安全配置建议').parentElement).toHaveClass(
      'rounded-[1.25rem]',
    );
  });
});
