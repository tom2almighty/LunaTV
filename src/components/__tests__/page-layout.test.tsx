import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PageLayout from '@/components/PageLayout';

vi.mock('@/components/Navbar', () => ({
  Navbar: () => <nav data-testid='navbar' />,
}));

describe('PageLayout', () => {
  it('offsets content below the floating navigation shell', () => {
    render(
      <PageLayout>
        <div>content</div>
      </PageLayout>,
    );

    expect(screen.getByRole('main')).toHaveClass('pt-20');
    expect(screen.getByText('content')).toBeVisible();
  });
});
