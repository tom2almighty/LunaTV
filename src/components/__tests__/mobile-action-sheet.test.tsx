import { fireEvent, render, screen } from '@testing-library/react';
import { PlayCircle } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import MobileActionSheet from '@/components/MobileActionSheet';

describe('MobileActionSheet', () => {
  it('renders a premium sheet shell and keeps actions clickable', () => {
    const onClose = vi.fn();
    const onPlay = vi.fn();

    render(
      <MobileActionSheet
        isOpen
        onClose={onClose}
        title='测试影片'
        poster='/poster.jpg'
        actions={[
          {
            id: 'play',
            label: '播放',
            icon: <PlayCircle size={20} />,
            onClick: onPlay,
            color: 'primary',
          },
        ]}
      />,
    );

    const playButton = screen.getByRole('button', { name: '播放' });
    expect(playButton).toHaveClass('rounded-2xl');
    fireEvent.click(playButton);
    expect(onPlay).toHaveBeenCalled();
  });
});
