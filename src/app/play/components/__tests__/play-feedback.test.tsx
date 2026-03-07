import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlayErrorView } from '@/app/play/components/play-error-view';
import { PlayLoadingView } from '@/app/play/components/play-loading-view';

describe('play feedback views', () => {
  it('renders the premium loading panel', () => {
    render(
      <PlayLoadingView loadingStage='fetching' loadingMessage='正在加载片源' />,
    );

    expect(screen.getByText('正在加载片源')).toBeVisible();
    expect(screen.getByText('请稍候片刻').parentElement).toHaveClass(
      'rounded-[1.75rem]',
    );
  });

  it('renders the premium error panel and keeps actions clickable', () => {
    const onBack = vi.fn();
    const onRetry = vi.fn();

    render(
      <PlayErrorView
        error='播放失败'
        videoTitle='庆余年'
        onBack={onBack}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '🔍 返回搜索' }));
    fireEvent.click(screen.getByRole('button', { name: '🔄 重新尝试' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
