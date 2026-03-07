import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SearchResultFilter from '@/components/SearchResultFilter';

describe('SearchResultFilter', () => {
  it('opens source options and applies the selected source filter', () => {
    const onChange = vi.fn();

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
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /测试源/i }));
    fireEvent.click(screen.getByRole('button', { name: '全部来源' }));

    expect(onChange).toHaveBeenCalledWith({
      source: 'all',
      title: 'all',
      year: 'all',
      yearOrder: 'desc',
    });
  });

  it('cycles year ordering for aggregate search results', () => {
    const onChange = vi.fn();

    render(
      <SearchResultFilter
        categories={[]}
        values={{ source: 'demo', yearOrder: 'desc' }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '按年份降序排序' }));

    expect(onChange).toHaveBeenCalledWith({
      source: 'demo',
      title: 'all',
      year: 'all',
      yearOrder: 'asc',
    });
  });
});
