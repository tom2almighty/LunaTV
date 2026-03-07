import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VideoCardView } from '@/components/video-card/video-card-view';

describe('VideoCardView', () => {
  it('renders a premium card wrapper and keeps click behavior', () => {
    const onClick = vi.fn();

    render(
      <VideoCardView
        dataTestId='video-card-view'
        onClick={onClick}
        onContextMenu={() => false}
        onDragStart={() => false}
        gestureProps={{}}
      >
        <div>card</div>
      </VideoCardView>,
    );

    const view = screen.getByTestId('video-card-view');
    expect(view).toHaveClass('rounded-[1.35rem]');
    fireEvent.click(view);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
