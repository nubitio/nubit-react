import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuantityStepper } from './QuantityStepper';

afterEach(cleanup);

describe('QuantityStepper', () => {
  it('steps up and down by the step', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityStepper label="Queso" value={2} step={0.5} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Más Queso' }));
    expect(onChange).toHaveBeenLastCalledWith(2.5);
    await user.click(screen.getByRole('button', { name: 'Menos Queso' }));
    expect(onChange).toHaveBeenLastCalledWith(1.5);
  });

  it('lands exactly on a fractional max instead of overshooting it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityStepper label="Queso" value={0} max={0.5} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Más Queso' }));
    expect(onChange).toHaveBeenCalledWith(0.5);
  });

  it('disables the buttons at the limits', () => {
    const { rerender } = render(<QuantityStepper label="Q" value={0} max={3} onChange={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Menos Q' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    rerender(<QuantityStepper label="Q" value={3} max={3} onChange={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Más Q' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('does not accumulate float noise', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityStepper label="Q" value={0.2} step={0.1} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Más Q' }));
    expect(onChange).toHaveBeenCalledWith(0.3);
  });
});
