import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  GlobalErrorIndicator,
  triggerGlobalError,
} from '@/components/GlobalErrorIndicator';

describe('GlobalErrorIndicator', () => {
  it('renders a restrained premium error toast', async () => {
    render(<GlobalErrorIndicator />);

    await act(async () => {
      triggerGlobalError('网络错误');
    });

    const closeButton = await screen.findByRole('button', {
      name: '关闭错误提示',
    });
    expect(
      closeButton.closest('div[class*="rounded-[1.25rem]"]') ||
        closeButton.parentElement,
    ).toHaveClass('rounded-[1.25rem]');
    expect(closeButton).toHaveClass('app-control');
  });
});
