import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ContinueWatching from '@/components/ContinueWatching';

const {
  clearAllPlayRecordsMock,
  getAllPlayRecordsMock,
  subscribeToDataUpdatesMock,
} = vi.hoisted(() => ({
  clearAllPlayRecordsMock: vi.fn(),
  getAllPlayRecordsMock: vi.fn(),
  subscribeToDataUpdatesMock: vi.fn(() => vi.fn()),
}));

vi.mock('@/lib/db', () => ({
  clearAllPlayRecords: clearAllPlayRecordsMock,
  getAllPlayRecords: getAllPlayRecordsMock,
  subscribeToDataUpdates: subscribeToDataUpdatesMock,
}));

vi.mock('@/components/ScrollableRow', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/VideoCard', () => ({
  default: ({ title }: { title?: string }) => <div>{title}</div>,
}));

describe('ContinueWatching', () => {
  beforeEach(() => {
    clearAllPlayRecordsMock.mockReset();
    getAllPlayRecordsMock.mockReset();
    subscribeToDataUpdatesMock.mockClear();
  });

  it('renders play history in descending save time order and clears it', async () => {
    getAllPlayRecordsMock.mockResolvedValue({
      'source-a+1': {
        title: '较早记录',
        cover: '',
        year: '2024',
        source_name: '线路A',
        total_episodes: 12,
        index: 1,
        search_title: '较早记录',
        play_time: 30,
        total_time: 100,
        save_time: 100,
      },
      'source-b+2': {
        title: '最新记录',
        cover: '',
        year: '2025',
        source_name: '线路B',
        total_episodes: 24,
        index: 2,
        search_title: '最新记录',
        play_time: 40,
        total_time: 100,
        save_time: 200,
      },
    });

    render(<ContinueWatching />);

    const cards = await screen.findAllByText(/记录/);
    expect(cards[0]).toHaveTextContent('最新记录');
    expect(cards[1]).toHaveTextContent('较早记录');
    expect(screen.getByRole('button', { name: '清空' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '清空' }));

    expect(clearAllPlayRecordsMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText('最新记录')).not.toBeInTheDocument();
    });
  });

  it('renders nothing when there is no watch history', async () => {
    getAllPlayRecordsMock.mockResolvedValue({});

    const { container } = render(<ContinueWatching />);

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
