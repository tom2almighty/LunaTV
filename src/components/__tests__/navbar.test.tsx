import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Navbar } from '@/components/Navbar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/context/SiteContext', () => ({
  useSite: () => ({ siteName: 'LunaTV' }),
}));

vi.mock('@/components/UserMenu', () => ({
  UserMenu: () => <div data-testid='user-menu' />,
}));

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => null,
}));

describe('Navbar', () => {
  it('renders the navigation inside a premium floating shell', () => {
    render(<Navbar />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('fixed');
    expect(nav).toHaveClass('backdrop-blur-xl');
    expect(screen.getByRole('link', { name: 'LunaTV' })).toBeVisible();
  });
});
