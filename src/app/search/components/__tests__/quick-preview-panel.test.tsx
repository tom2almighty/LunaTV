import { fireEvent, render, screen } from '@testing-library/react';
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
});
