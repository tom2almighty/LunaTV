import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EpisodeSelector from '@/components/EpisodeSelector';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('EpisodeSelector view', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
    pushMock.mockReset();
  });

  it('starts from episode selection and switches to another source', () => {
    const onSourceChange = vi.fn();

    render(
      <EpisodeSelector
        totalEpisodes={3}
        episodes_titles={['第1集', '第2集', '第3集']}
        value={1}
        currentSource='a'
        currentId='1'
        availableSources={[
          {
            source: 'a',
            id: '1',
            title: '测试-A',
            source_name: '线路A',
            episodes: ['1'],
            episodes_titles: ['第1集'],
          } as never,
          {
            source: 'b',
            id: '2',
            title: '测试-B',
            source_name: '线路B',
            episodes: ['1', '2'],
            episodes_titles: ['第1集', '第2集'],
          } as never,
        ]}
        onSourceChange={onSourceChange}
      />,
    );

    expect(screen.getByRole('button', { name: '1' })).toBeVisible();
    expect(screen.queryByText('线路B')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('换源'));

    expect(screen.getByText('当前源')).toBeVisible();
    fireEvent.click(screen.getByText('线路B'));

    expect(onSourceChange).toHaveBeenCalledWith('b', '2', '测试-B');
  });

  it('jumps back to search when source matching is wrong', () => {
    render(
      <EpisodeSelector
        totalEpisodes={1}
        episodes_titles={['第1集']}
        value={1}
        videoTitle='测试影片'
        availableSources={[
          {
            source: 'a',
            id: '1',
            title: '测试-A',
            source_name: '线路A',
            episodes: ['1'],
            episodes_titles: ['第1集'],
          } as never,
        ]}
      />,
    );

    fireEvent.click(screen.getByText('影片匹配有误？点击去搜索'));

    expect(pushMock).toHaveBeenCalledWith(
      '/search?q=%E6%B5%8B%E8%AF%95%E5%BD%B1%E7%89%87',
    );
  });
});
