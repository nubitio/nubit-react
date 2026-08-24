/**
 * The MONEY Field-Type module — the last mile of the exact-decimal path.
 *
 * The backend keeps amounts in minor units and publishes them as strings
 * precisely so no runtime turns them into a double. That guarantee is only
 * worth as much as this module: it is the one place where a stray
 * `Number(value)` would spend the whole chain's exactness, and where a
 * half-typed amount decides whether the form sends what is on screen.
 *
 * Tested through the FieldTypeModule interface, which is the surface the grid,
 * form and serializers actually consume.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { configureCore, getCoreLocale } from '@nubitio/core';
import { FieldType } from '../../FieldType';
import { moneyField } from '../../FieldBuilders';
import { getFieldTypeModule } from '../registry';
import { HydraAdapter } from '../../../adapter/HydraAdapter';
import type { Field } from '../../Field';
import type { FieldControlProps, SerializeFieldContext } from '../FieldTypeModule';

const mod = getFieldTypeModule(FieldType.MONEY);
const ctx: SerializeFieldContext = { adapter: HydraAdapter };

// Every assertion below depends on separator conventions, so the locale is
// pinned rather than inherited — the suite's default is 'es', where '.' groups
// thousands, and a test that silently depended on that would be unreadable.
const originalLocale = getCoreLocale();
beforeEach(() => configureCore({ locale: 'en-US' }));
afterEach(() => {
  cleanup();
  configureCore({ locale: originalLocale });
});

function field(over: Partial<Field> = {}): Field {
  return { ...moneyField().name('total').label('Total').currency('EUR').build(), ...over };
}

/** What Intl produces for this amount in the pinned locale. */
function expectedText(amount: string, scale = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: scale,
    maximumFractionDigits: scale,
  }).format(amount as unknown as number);
}

const eur = (amount: string, scale = 2) => ({ amount, currency: 'EUR', scale });

describe('MONEY cell text', () => {
  it('formats the decimal literal without routing it through a number', () => {
    // 2^53 minor units is where a double stops being exact. The literal has to
    // survive verbatim, which is the whole reason the API sends a string.
    const huge = '99999999999999.99';
    expect(mod.cellText!(field(), eur(huge), {} as never)).toBe(expectedText(huge));
  });

  it('honours the currency scale rather than assuming two decimals', () => {
    expect(mod.cellText!(field(), { amount: '5000', currency: 'JPY', scale: 0 }, {} as never)).toBe(
      expectedText('5000', 0),
    );
    expect(
      mod.cellText!(field(), { amount: '1.234', currency: 'KWD', scale: 3 }, {} as never),
    ).toBe(expectedText('1.234', 3));
  });

  it('renders an empty cell instead of throwing on a malformed row', () => {
    // A grid paints thousands of cells; one bad row must not take the page down.
    for (const bad of [null, undefined, 'not money', 42, {}, { amount: 12, currency: 'EUR' }]) {
      expect(mod.cellText!(field(), bad, {} as never)).toBe('');
    }
  });
});

describe('MONEY serialization', () => {
  it('sends an already-parsed value straight through, dropping the scale', () => {
    expect(mod.serializeFormValue!(field(), eur('12.50'), ctx)).toEqual({
      kind: 'set',
      value: { amount: '12.50', currency: 'EUR' },
    });
  });

  it('omits an empty value and keeps an identity field', () => {
    expect(mod.serializeFormValue!(field(), '', ctx)).toEqual({ kind: 'omit' });
    expect(mod.serializeFormValue!(field(), null, ctx)).toEqual({ kind: 'omit' });
    expect(mod.serializeFormValue!(field(), undefined, ctx)).toEqual({ kind: 'omit' });
    expect(mod.serializeFormValue!(field({ isIdentity: true }), eur('1.00'), ctx)).toEqual({
      kind: 'keep',
    });
  });

  it('parses raw text using the field currency and scale', () => {
    expect(mod.serializeFormValue!(field(), '1234.56', ctx)).toEqual({
      kind: 'set',
      value: { amount: '1234.56', currency: 'EUR' },
    });
  });

  it('reads separators in the active locale, not a fixed convention', () => {
    // The same eight characters are two different amounts depending on who is
    // reading. Pinning both directions is what stops a "harmless" refactor of
    // normalizeSeparators from moving every amount by a factor of a thousand.
    configureCore({ locale: 'en-US' });
    expect(mod.serializeFormValue!(field(), '1,234.56', ctx)).toEqual({
      kind: 'set',
      value: { amount: '1234.56', currency: 'EUR' },
    });

    configureCore({ locale: 'es-ES' });
    expect(mod.serializeFormValue!(field(), '1.234,56', ctx)).toEqual({
      kind: 'set',
      value: { amount: '1234.56', currency: 'EUR' },
    });
  });

  it('sends a rejected amount as typed so the server can explain it', () => {
    // More decimals than the currency has. Coercing it here would send a
    // different number than the one on screen — the failure mode this whole
    // type exists to prevent. The server answers with a validation error the
    // user can act on instead.
    expect(mod.serializeFormValue!(field(), '12.999', ctx)).toEqual({
      kind: 'set',
      value: '12.999',
    });
    expect(mod.serializeFormValue!(field(), 'abc', ctx)).toEqual({ kind: 'set', value: 'abc' });
  });

  it('respects a field scale wider than two decimals', () => {
    expect(mod.serializeFormValue!(field({ scale: 3, currency: 'KWD' }), '1.234', ctx)).toEqual({
      kind: 'set',
      value: { amount: '1.234', currency: 'KWD' },
    });
  });

  it('omits a non-string, non-money value rather than guessing', () => {
    // A bare number is exactly what must never become an amount silently.
    expect(mod.serializeFormValue!(field(), 12.5, ctx)).toEqual({ kind: 'omit' });
  });

  it('serializes a detail row the same way as the main form', () => {
    // A line's amount and a header's amount are the same money; a detail grid
    // that serialized differently is how a document's total stops matching the
    // sum of its lines.
    expect(mod.serializeDetailValue!(field(), eur('9.99'), HydraAdapter)).toEqual(
      mod.serializeFormValue!(field(), eur('9.99'), ctx),
    );
  });
});

describe('MONEY control', () => {
  function renderControl(over: Partial<FieldControlProps> = {}) {
    const setFieldValue = vi.fn();
    const props: FieldControlProps = {
      field: field(),
      value: null,
      error: undefined,
      errorClass: '',
      disabled: undefined,
      readOnly: false,
      commonProps: { name: 'total', id: 'total' } as never,
      setFieldValue,
      ctx: {} as never,
      ...over,
    };
    render(<>{mod.ControlRender(props)}</>);
    return { setFieldValue, input: screen.getByRole('textbox') as HTMLInputElement };
  }

  it('edits the decimal literal, not a formatted string', () => {
    // The editor shows "1234.56", never "1,234.56": the text in the box is the
    // value, so what round-trips is what was typed.
    const { input } = renderControl({ value: eur('1234.56') });
    expect(input.value).toBe('1234.56');
  });

  it('shows the currency from the value, falling back to the field', () => {
    renderControl({ value: { amount: '100', currency: 'JPY', scale: 0 } });
    expect(screen.getByText('JPY').textContent).toBe('JPY');
  });

  it('falls back to the field currency while the value is still empty', () => {
    renderControl({ value: null });
    expect(screen.getByText('EUR').textContent).toBe('EUR');
  });

  it('keeps half-typed text as text rather than erasing the keystroke', () => {
    const { setFieldValue, input } = renderControl({ value: '' });

    // "12." is a legitimate waypoint on the way to "12.50". Upgrading it early
    // would fight the user's cursor; rejecting it would drop the keystroke.
    fireEvent.change(input, { target: { value: '12.' } });
    expect(setFieldValue).toHaveBeenLastCalledWith('total', '12.');
  });

  it('upgrades a complete amount to the object shape', () => {
    const { setFieldValue, input } = renderControl({ value: '12.5' });

    fireEvent.change(input, { target: { value: '12.50' } });
    expect(setFieldValue).toHaveBeenLastCalledWith('total', eur('12.50'));
  });

  it('keeps an over-precise amount as text instead of rounding it', () => {
    const { setFieldValue, input } = renderControl({ value: '' });

    fireEvent.change(input, { target: { value: '12.999' } });
    expect(setFieldValue).toHaveBeenLastCalledWith('total', '12.999');
  });

  it('never hands a number to setFieldValue', () => {
    const { setFieldValue, input } = renderControl({ value: '' });

    for (const text of ['7', '7.5', '7.50', '1,234.56', 'abc', '']) {
      fireEvent.change(input, { target: { value: text } });
    }

    expect(setFieldValue).toHaveBeenCalled();
    for (const call of setFieldValue.mock.calls) {
      expect(typeof call[1]).not.toBe('number');
    }
  });
});

describe('MONEY form taxonomy', () => {
  it('is a compact text control, so adapter backends do not need a money widget', () => {
    expect(mod.controlKind).toBe('text');
    expect(mod.formWidth!(field())).toBe('compact');
  });

  it('filters with the numeric operator set', () => {
    // The backend column holds minor units, so numeric comparison is correct;
    // filtering the formatted text would order "9.50" after "1000.00".
    expect(mod.defaultFilterOperator).toBe('=');
    expect(mod.filterOperators.map((op) => op.value)).toContain('>=');
  });
});
