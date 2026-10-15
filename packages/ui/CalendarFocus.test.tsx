import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { DatePicker } from './DatePicker';
import { DateRangePicker } from './DateRangePicker';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

for (const kind of ['date', 'range'] as const) {
  it(`${kind} input does not reclaim focus after the user moves to another control`, () => {
    vi.useFakeTimers();
    render(
      <>
        {kind === 'date' ? <DatePicker ariaLabel="Date" /> : <DateRangePicker ariaLabel="Dates" />}
        <button type="button">Next control</button>
      </>,
    );
    const input =
      kind === 'date'
        ? screen.getByRole('combobox', { name: 'Date' })
        : screen.getByRole('textbox', { name: 'Start date Dates' });
    const next = screen.getByRole('button', { name: 'Next control' });
    act(() => {
      input.focus();
      next.focus();
      vi.runAllTimers();
    });
    expect(document.activeElement).toBe(next);
  });
}
