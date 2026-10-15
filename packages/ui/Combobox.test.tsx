import { createRef, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Combobox, MultiSelect } from './Combobox';
import { ES_UI_STRINGS, UiStringsProvider } from './UiStrings';
import { AppDialog } from './AppDialog';

afterEach(cleanup);

const options = [
  { value: 'pe', label: 'Peru' },
  { value: 'cl', label: 'Chile' },
  { value: 'ar', label: 'Argentina', disabled: true },
];

function Example() {
  const [value, setValue] = useState<string | null>('pe');
  return (
    <form aria-label="Address">
      <Combobox
        label="Country"
        name="country"
        options={options}
        value={value}
        onChange={setValue}
      />
    </form>
  );
}

describe('Combobox', () => {
  it('dismisses its popup without closing the surrounding dialog on the same Escape', async () => {
    const onClose = vi.fn();
    render(
      <AppDialog title="Address" open onClose={onClose}>
        <Combobox label="Country" options={options} value={null} onChange={vi.fn()} />
      </AppDialog>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'Ch');
    await screen.findByRole('option', { name: 'Chile' });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
  it('selects multiple IDs, submits them and removes a chip', async () => {
    function MultipleExample() {
      const [value, setValue] = useState(['pe']);
      return (
        <form aria-label="Multiple address">
          <MultiSelect
            label="Countries"
            name="countries"
            options={options}
            value={value}
            onChange={setValue}
          />
        </form>
      );
    }
    const user = userEvent.setup();
    render(<MultipleExample />);
    const input = screen.getByRole('combobox', { name: 'Countries' });
    await user.type(input, 'Ch');
    await screen.findByRole('option', { name: 'Chile' });
    await user.keyboard('{ArrowDown}{Enter}{Escape}');
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).getAll('countries')).toEqual([
      'pe',
      'cl',
    ]);
    await user.click(screen.getByRole('button', { name: /^Remove Peru/ }));
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).getAll('countries')).toEqual([
      'cl',
    ]);
  });

  it('prevents removing a read-only multi-selection', () => {
    render(
      <MultiSelect
        label="Countries"
        options={options}
        value={['pe']}
        onChange={vi.fn()}
        readOnly
      />,
    );
    expect(screen.queryByRole('button', { name: /^Remove Peru/ })).toBeNull();
    expect(screen.getByText('Peru')).toBeTruthy();
  });
  it('filters options, selects by keyboard and submits the ID rather than the label', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const input = screen.getByRole('combobox', { name: 'Country' });
    await user.clear(input);
    await user.type(input, 'Ch');
    expect(await screen.findByRole('option', { name: 'Chile' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Peru' })).toBeNull();
    await user.keyboard('{ArrowDown}{Enter}');
    expect((input as HTMLInputElement).value).toBe('Chile');
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('country')).toBe('cl');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('forwards the input ref and connects validation text to the field', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Combobox
        ref={ref}
        label="Country"
        options={options}
        value={null}
        onChange={vi.fn()}
        error="Choose a country"
      />,
    );
    const input = screen.getByRole('combobox');
    expect(ref.current).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Choose a country',
    );
  });

  it('localizes empty results and action labels', async () => {
    const user = userEvent.setup();
    render(
      <UiStringsProvider strings={ES_UI_STRINGS}>
        <Combobox label="País" options={options} value={null} onChange={vi.fn()} />
      </UiStringsProvider>,
    );
    expect(screen.getByRole('button', { name: /^Abrir opciones/ })).toBeTruthy();
    await user.type(screen.getByRole('combobox'), 'Unknown');
    expect(await screen.findByText('No se encontraron opciones')).toBeTruthy();
  });

  it('does not open a disabled control', async () => {
    const onChange = vi.fn();
    render(
      <Combobox label="Country" options={options} value={null} onChange={onChange} disabled />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /^Open options/ }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
