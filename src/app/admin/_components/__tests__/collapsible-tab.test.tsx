import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CollapsibleTab } from '@/app/admin/_components/CollapsibleTab';

describe('CollapsibleTab', () => {
  it('renders a premium panel shell and toggles content', () => {
    const onToggle = vi.fn();

    render(
      <CollapsibleTab title='站点配置' isExpanded={false} onToggle={onToggle}>
        <div>content</div>
      </CollapsibleTab>,
    );

    const trigger = screen.getByRole('button', { name: '站点配置' });
    expect(trigger).toHaveClass('backdrop-blur-xl');
    fireEvent.click(trigger);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
