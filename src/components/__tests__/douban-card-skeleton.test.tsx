import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';

describe('DoubanCardSkeleton', () => {
  it('renders restrained premium skeleton surfaces', () => {
    const { container } = render(<DoubanCardSkeleton />);

    expect(container.firstElementChild?.firstElementChild).toHaveClass(
      'rounded-[1.25rem]',
    );
    expect(screen.getByTestId('douban-skeleton-title')).toHaveClass(
      'app-control',
    );
  });
});
