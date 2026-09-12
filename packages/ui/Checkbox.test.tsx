import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

afterEach(cleanup);

describe('Checkbox', () => {
  it('calls onChange when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} label="Accept" />);
    await user.click(screen.getByRole('checkbox', { name: 'Accept' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('sets indeterminate on the native input', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Pick" indeterminate />);
    expect(screen.getByRole('checkbox')).toHaveProperty('indeterminate', true);
  });

  it('does not call onChange when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} label="Accept" disabled />);
    await user.click(screen.getByRole('checkbox', { name: 'Accept' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
