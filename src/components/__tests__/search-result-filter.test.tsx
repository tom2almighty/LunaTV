import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SearchResultFilter from '@/components/SearchResultFilter';

describe('SearchResultFilter', () => {
  it('renders premium filter triggers and opens the selected menu', () => {
    render(
      <SearchResultFilter
        categories={[
          {
            key: 'source',
            label: '来源',
            options: [
              { label: '全部来源', value: 'all' },
              { label: '测试源', value: 'demo' },
            ],
          },
        ]}
        values={{ source: 'demo', yearOrder: 'desc' }}
        onChange={() => {}}
      />,
    );

    const sourceButton = screen.getByRole('button', { name: /测试源/i });
    expect(sourceButton).toHaveClass('backdrop-blur-xl');
    expect(sourceButton).toHaveClass('text-[var(--accent)]');
    fireEvent.click(sourceButton);
    const sourceOptions = screen.getAllByRole('button', { name: '测试源' });
    expect(sourceOptions.at(-1)).toBeVisible();
    expect(sourceOptions.at(-1)).toHaveClass('rounded-xl');
  });
});
