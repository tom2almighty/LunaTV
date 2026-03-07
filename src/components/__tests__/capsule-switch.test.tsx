import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CapsuleSwitch from '@/components/CapsuleSwitch';

describe('CapsuleSwitch', () => {
  it('renders the premium segmented shell and changes the active option', () => {
    const onChange = vi.fn();

    const { container } = render(
      <CapsuleSwitch
        options={[
          { label: '首页', value: 'home' },
          { label: '收藏', value: 'favorites' },
        ]}
        active='home'
        onChange={onChange}
      />,
    );

    expect(container.firstChild).toHaveClass('backdrop-blur-xl');
    fireEvent.click(screen.getByRole('button', { name: '收藏' }));
    expect(onChange).toHaveBeenCalledWith('favorites');
  });
});
