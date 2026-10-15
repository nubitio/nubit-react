import React, { createRef, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker, parseDisplayDate } from './DatePicker';
import { DateRangePicker } from './DateRangePicker';
import { TimePicker } from './TimePicker';

afterEach(cleanup);

it('parses locale date order, leap days and ISO values without timezone conversion', () => {
  expect(parseDisplayDate('02/29/2024', 'en-US')).toBe('2024-02-29');
  expect(parseDisplayDate('29/02/2024', 'es-PE')).toBe('2024-02-29');
  expect(parseDisplayDate('2024/02/29', 'ja-JP')).toBe('2024-02-29');
  expect(parseDisplayDate('29/02/2025', 'es-PE')).toBeNull();
  expect(parseDisplayDate('2026-01-01', 'en-US')).toBe('2026-01-01');
});

it('preserves the native ref, external label, field ID and ISO form submission', async () => {
  const ref = createRef<HTMLInputElement>();
  function Form() {
    const [value, setValue] = useState('2026-06-01');
    return (
      <form aria-label="Event">
        <label htmlFor="nb-form-date">Event date</label>
        <DatePicker
          ref={ref}
          id="nb-form-date"
          name="date"
          locale="en-US"
          value={value}
          onChange={setValue}
        />
      </form>
    );
  }
  render(<Form />);
  const input = screen.getByRole('combobox', { name: 'Event date' });
  expect(ref.current).toBe(input);
  expect((input as HTMLInputElement).value).toBe('06/01/2026');
  await userEvent.clear(input);
  await userEvent.paste('2026-12-31');
  await userEvent.keyboard('{Enter}');
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('date')).toBe('2026-12-31');
});

it('rejects invalid and out-of-bounds typed dates and supports clearing', () => {
  const change = vi.fn();
  render(
    <DatePicker
      ariaLabel="Date"
      locale="en-US"
      value="2026-06-10"
      min="2026-06-01"
      max="2026-06-30"
      onChange={change}
    />,
  );
  const input = screen.getByRole('combobox', { name: 'Date' });
  for (const value of ['02/30/2026', '07/01/2026']) {
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  }
  expect(change).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  expect(change).toHaveBeenLastCalledWith('');
});

it('keeps partial ranges and sorts a completed range', () => {
  const change = vi.fn();
  const { rerender } = render(
    <DateRangePicker locale="en-US" ariaLabel="Period" onChange={change} />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Start date Period' }), {
    target: { value: '06/20/2026' },
  });
  fireEvent.blur(screen.getByRole('textbox', { name: 'Start date Period' }));
  expect(change).toHaveBeenLastCalledWith('2026-06-20', '');
  rerender(
    <DateRangePicker locale="en-US" ariaLabel="Period" startValue="2026-06-20" onChange={change} />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'End date Period' }), {
    target: { value: '06/10/2026' },
  });
  fireEvent.blur(screen.getByRole('textbox', { name: 'End date Period' }));
  expect(change).toHaveBeenLastCalledWith('2026-06-10', '2026-06-20');
});

it('edits segmented wall-clock time by keyboard and submits its value', async () => {
  const change = vi.fn();
  function Form() {
    const [value, setValue] = useState('23:58');
    return (
      <form aria-label="Time">
        <TimePicker
          name="time"
          ariaLabel="Start time"
          locale="en-US"
          hourCycle={24}
          value={value}
          onChange={(next) => {
            setValue(next);
            change(next);
          }}
        />
      </form>
    );
  }
  render(<Form />);
  const minutes = screen.getByRole('spinbutton', { name: /minute/ });
  minutes.focus();
  await userEvent.keyboard('{ArrowUp}');
  expect(change).toHaveBeenLastCalledWith('23:59');
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('time')).toBe('23:59:00');
});

it('supports seconds and read-only time values', async () => {
  const change = vi.fn();
  const { rerender } = render(
    <TimePicker
      ariaLabel="Time"
      value="09:30:15"
      granularity="second"
      hourCycle={24}
      onChange={change}
    />,
  );
  screen.getByRole('spinbutton', { name: /second/ }).focus();
  await userEvent.keyboard('{ArrowUp}');
  expect(change).toHaveBeenLastCalledWith('09:30:16');
  change.mockClear();
  rerender(
    <TimePicker
      ariaLabel="Time"
      value="09:30:15"
      readOnly
      granularity="second"
      hourCycle={24}
      onChange={change}
    />,
  );
  screen.getByRole('spinbutton', { name: /second/ }).focus();
  await userEvent.keyboard('{ArrowUp}');
  expect(change).not.toHaveBeenCalled();
});

it('accepts typed year-first dates and exposes a matching placeholder', async () => {
  const change = vi.fn();
  render(<DatePicker ariaLabel="Date" locale="ja-JP" onChange={change} />);
  const input = screen.getByRole('combobox', { name: 'Date' });
  expect(input.getAttribute('placeholder')).toBe('yyyy/mm/dd');
  await userEvent.type(input, '20260228{Enter}');
  expect(change).toHaveBeenLastCalledWith('2026-02-28');
});

it('exposes time bounds as an accessible validation error', () => {
  const { container, rerender } = render(
    <TimePicker ariaLabel="Time" value="07:30" min="08:00" max="18:00" hourCycle={24} />,
  );
  expect(container.querySelector('.nb-time-picker')?.hasAttribute('data-invalid')).toBe(true);
  rerender(<TimePicker ariaLabel="Time" value="09:30" min="08:00" max="18:00" hourCycle={24} />);
  expect(container.querySelector('.nb-time-picker')?.hasAttribute('data-invalid')).toBe(false);
});
