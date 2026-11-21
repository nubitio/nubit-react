import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppDropdown } from './AppDropdown';

afterEach(cleanup);

const options = [
  { value: 'usb', label: 'WebUSB', description: 'Desde el navegador, sin instalar nada' },
  { value: 'agent', label: 'Agente de hardware', description: 'Impresora y balanza locales' },
  { value: 'none', label: 'Ninguno' },
];

describe('AppDropdown', () => {
  it('shows an option description under its label in the menu, never in the trigger', async () => {
    render(
      <AppDropdown
        ariaLabel="Método"
        value="usb"
        options={options}
        onChange={vi.fn()}
        showFieldLabel={false}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: 'Método' });
    expect(trigger.textContent).toContain('WebUSB');
    expect(trigger.textContent).not.toContain('Desde el navegador');

    await userEvent.setup().click(trigger);

    expect(await screen.findByText('Desde el navegador, sin instalar nada')).toBeTruthy();
    expect(screen.getByText('Impresora y balanza locales')).toBeTruthy();
  });

  it('selects an option that has a description', async () => {
    const onChange = vi.fn();
    render(
      <AppDropdown
        ariaLabel="Método"
        value="usb"
        options={options}
        onChange={onChange}
        showFieldLabel={false}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'Método' }));
    await user.click(await screen.findByRole('option', { name: /Agente de hardware/ }));
    expect(onChange).toHaveBeenCalledWith('agent');
  });

  it('keeps the plain markup for options without a description', async () => {
    render(
      <AppDropdown
        ariaLabel="Método"
        value="none"
        options={options}
        onChange={vi.fn()}
        showFieldLabel={false}
      />,
    );
    await userEvent.setup().click(screen.getByRole('combobox', { name: 'Método' }));
    const plain = await screen.findByRole('option', { name: 'Ninguno' });
    expect(plain.querySelector('.nb-dropdown__option-text')).toBeNull();
  });

  it('fits the menu to its content only when asked to', async () => {
    const { rerender } = render(
      <AppDropdown
        ariaLabel="Método"
        value="usb"
        options={options}
        onChange={vi.fn()}
        showFieldLabel={false}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'Método' }));
    await screen.findByRole('listbox');
    expect(document.querySelector('.nb-dropdown-positioner--content')).toBeNull();
    expect(document.querySelector('.nb-dropdown__menu--fit')).toBeNull();

    await user.keyboard('{Escape}');
    rerender(
      <AppDropdown
        ariaLabel="Método"
        value="usb"
        options={options}
        onChange={vi.fn()}
        showFieldLabel={false}
        menuWidth="content"
      />,
    );
    await user.click(screen.getByRole('combobox', { name: 'Método' }));
    await screen.findByRole('listbox');
    expect(document.querySelector('.nb-dropdown-positioner--content')).not.toBeNull();
    expect(document.querySelector('.nb-dropdown__menu--fit')).not.toBeNull();
  });
});
