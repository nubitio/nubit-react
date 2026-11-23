import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ButtonLink } from './Button';
import { FormField, TextField } from './FormControls';

afterEach(cleanup);

describe('ButtonLink', () => {
  it('renders an anchor styled as a button', () => {
    render(
      <ButtonLink href="/x" variant="primary">
        Ir
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Ir' });
    expect(link.getAttribute('href')).toBe('/x');
    expect(link.classList.contains('nb-button')).toBe(true);
    expect(link.classList.contains('nb-button--primary')).toBe(true);
  });

  it('renders a custom component and forwards its props', () => {
    const Custom = ({ to, children, ...rest }: { to: string; children?: React.ReactNode }) => (
      <a href={to} data-custom {...rest}>
        {children}
      </a>
    );
    render(
      <ButtonLink as={Custom} to="/y">
        Ver
      </ButtonLink>,
    );
    expect(screen.getByRole('link', { name: 'Ver' }).getAttribute('href')).toBe('/y');
  });

  it('blocks clicks and is aria-disabled when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ButtonLink href="/x" disabled onClick={onClick}>
        Ir
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Ir' });
    expect(link.getAttribute('aria-disabled')).toBe('true');
    await user.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('FormField required', () => {
  it('marks the label as required without leaking the prop to the DOM', () => {
    const { container } = render(
      <FormField label="Monto" required>
        <TextField />
      </FormField>,
    );
    expect(container.querySelector('.nb-form-field__label--required')).not.toBeNull();
    expect(container.querySelector('label')!.hasAttribute('required')).toBe(false);
  });

  it('does not mark optional fields', () => {
    const { container } = render(
      <FormField label="Nota">
        <TextField />
      </FormField>,
    );
    expect(container.querySelector('.nb-form-field__label--required')).toBeNull();
  });
});
