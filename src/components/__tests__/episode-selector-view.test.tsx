import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EpisodeSelector from '@/components/EpisodeSelector';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('EpisodeSelector view', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it('renders the premium shell and switches to source view', () => {
    render(
      <EpisodeSelector
        totalEpisodes={3}
        episodes_titles={['第1集', '第2集', '第3集']}
        value={1}
        availableSources={[
          {
            source: 'a',
            id: '1',
            title: '测试',
            source_name: '线路A',
            episodes: ['1'],
            episodes_titles: ['第1集'],
          } as never,
        ]}
      />,
    );

    expect(
      screen.getByText('选集').closest('div')?.parentElement?.parentElement,
    ).toHaveClass('rounded-[1.5rem]');

    fireEvent.click(screen.getByText('换源'));

    expect(screen.getByText('线路A')).toBeVisible();
    expect(screen.getByText('换源')).toHaveClass('bg-[var(--accent)]/10');
  });
});
