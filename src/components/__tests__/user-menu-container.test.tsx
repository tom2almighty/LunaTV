import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserMenuContainer } from '@/components/user-menu/user-menu-container';

vi.mock('@/components/user-menu/settings-modal', () => ({
  SettingsModal: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('UserMenuContainer', () => {
  it('renders the trigger as a premium control shell', () => {
    render(
      <UserMenuContainer
        isOpen={false}
        mounted={true}
        isSettingsOpen={false}
        isChangePasswordOpen={false}
        onToggleMenu={vi.fn()}
        menuPanel={null}
        settingsPanel={null}
        changePasswordPanel={null}
      />,
    );

    expect(screen.getByRole('button', { name: 'User Menu' })).toHaveClass(
      'app-control',
    );
  });
});
