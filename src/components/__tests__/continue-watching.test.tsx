import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ContinueWatching from '@/components/ContinueWatching';

vi.mock('@/lib/db', () => ({
  clearAllPlayRecords: vi.fn(),
  getAllPlayRecords: () => new Promise(() => {}),
  subscribeToDataUpdates: vi.fn(() => vi.fn()),
}));

vi.mock('@/components/ScrollableRow', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/VideoCard', () => ({
  default: () => <div>video</div>,
}));

describe('ContinueWatching', () => {
  it('renders premium loading skeleton surfaces', () => {
    const { container } = render(<ContinueWatching />);

    expect(screen.getByText('继续观看').closest('section')).toHaveClass(
      'app-panel',
    );
    expect(container.querySelector('.animate-pulse')).toHaveClass(
      'app-control',
    );
  });
});
