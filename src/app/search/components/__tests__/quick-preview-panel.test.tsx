import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { QuickPreviewPanel } from '../quick-preview-panel';

describe('QuickPreviewPanel', () => {
  it('renders primary and secondary actions with consistent labels', () => {
    const onPlay = vi.fn();
    render(
      <QuickPreviewPanel
        mode='desktop'
        open
        title='庆余年'
        sourceCount={6}
        onClose={() => {}}
        onPlayNow={onPlay}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '立即播放' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: '换源预览' }),
    ).toBeInTheDocument();
  });

  it('keeps identical CTA labels and order across desktop and mobile', () => {
    render(
      <>
        <QuickPreviewPanel
          mode='desktop'
          open
          title='庆余年'
          sourceCount={6}
          onClose={() => {}}
          onPlayNow={() => {}}
        />
        <QuickPreviewPanel
          mode='mobile'
          open
          title='庆余年'
          sourceCount={6}
          onClose={() => {}}
          onPlayNow={() => {}}
        />
      </>,
    );

    const desktopLabels = within(screen.getByTestId('quick-preview-desktop'))
      .getAllByRole('button')
      .map((button) => button.textContent);
    const mobileLabels = within(screen.getByTestId('quick-preview-mobile'))
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(desktopLabels).toEqual(['关闭', '立即播放', '换源预览', '收藏']);
    expect(mobileLabels).toEqual(['关闭', '立即播放', '换源预览', '收藏']);
  });
});
