import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserMenu } from '@/components/UserMenu';

const requestJsonMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api/client', () => ({
  requestJson: (...args: unknown[]) => requestJsonMock(...args),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    requestJsonMock.mockReset();
    requestJsonMock.mockResolvedValue({ username: 'alice', role: 'user' });
  });

  it('does not render the legacy settings action after opening the menu', async () => {
    render(<UserMenu />);

    const trigger = screen.getByRole('button', { name: 'User Menu' });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('登出')).toBeVisible();
    });

    expect(screen.queryByText('设置')).not.toBeInTheDocument();
    expect(screen.queryByText('本地设置')).not.toBeInTheDocument();
  });
});
