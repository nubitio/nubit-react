import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  it('renders options and calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SegmentedControl
        ariaLabel="Estado"
        value="all"
        onChange={onChange}
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'low', label: 'Bajo mínimo' },
        ]}
      />,
    );

    expect(screen.getByRole('group', { name: 'Estado' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Bajo mínimo' }));
    expect(onChange).toHaveBeenCalledWith('low');
  });
});