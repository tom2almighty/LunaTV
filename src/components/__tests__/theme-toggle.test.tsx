import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThemeToggle } from '@/components/ThemeToggle';

import { ThemeProvider } from '@/context/ThemeContext';

describe('ThemeToggle', () => {
  it('does not render a theme switcher in dark-only mode', async () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark');
      expect(document.documentElement).toHaveAttribute('data-mode', 'dark');
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
