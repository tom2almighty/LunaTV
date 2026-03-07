import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UserMenuContainer } from '@/components/user-menu/user-menu-container';

describe('UserMenuContainer', () => {
  it('renders the trigger as a premium control shell', () => {
    render(
      <UserMenuContainer
        isOpen={false}
        mounted={true}
        isChangePasswordOpen={false}
        onToggleMenu={vi.fn()}
        menuPanel={null}
        changePasswordPanel={null}
      />,
    );

    expect(screen.getByRole('button', { name: 'User Menu' })).toHaveClass(
      'app-control',
    );
  });
});
