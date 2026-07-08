import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toggle } from './Toggle';

afterEach(cleanup);

describe('Toggle', () => {
  it('calls onChange when clicked without a label prop', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Toggle checked={false} onChange={onChange} aria-label="Activar" />);

    // The input itself is visually hidden (pointer-events: none by design);
    // real users click the visible track, which must relay to the input.
    await user.click(screen.getByRole('checkbox', { name: 'Activar' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange when clicked with a label prop', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Toggle checked={false} onChange={onChange} label="Activar" />);

    await user.click(screen.getByRole('checkbox', { name: 'Activar' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
