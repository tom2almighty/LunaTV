import { describe, expect, it } from 'vitest';

import { computeScrollableRowState } from '@/components/ScrollableRow';

describe('computeScrollableRowState', () => {
  it('shows only right affordance at initial position', () => {
    expect(
      computeScrollableRowState({
        scrollWidth: 1200,
        clientWidth: 800,
        scrollLeft: 0,
      }),
    ).toEqual({
      canScrollLeft: false,
      canScrollRight: true,
    });
  });

  it('shows only left affordance near the end position', () => {
    expect(
      computeScrollableRowState({
        scrollWidth: 1200,
        clientWidth: 800,
        scrollLeft: 401,
      }),
    ).toEqual({
      canScrollLeft: true,
      canScrollRight: false,
    });
  });

  it('hides both affordances when content does not overflow', () => {
    expect(
      computeScrollableRowState({
        scrollWidth: 800,
        clientWidth: 800,
        scrollLeft: 0,
      }),
    ).toEqual({
      canScrollLeft: false,
      canScrollRight: false,
    });
  });
});
