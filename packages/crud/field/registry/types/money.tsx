import { useEffect, useRef, useState } from 'react';
import { formatMoney, getCoreCurrency, parseMoney, parseMoneyInput } from '@nubitio/core';
import type { MoneyValue } from '@nubitio/core';
import type { FieldControlProps, FieldTypeModule } from '../FieldTypeModule';
import { renderDefaultFilterCell } from '../filterHelpers';
import { defaultBuildFilterTerms, KEEP, NUMERIC_OPERATORS, OMIT, set } from '../shared';

/**
 * A field holding an exact monetary amount.
 *
 * Distinct from CURRENCY, which is a number with two decimals and a right
 * alignment. This type never converts the amount to a JavaScript number: it
 * carries the `{ amount, currency, scale }` object the API publishes, edits it
 * as text, and hands it back in the same shape. A single `Number(value)` here
 * would undo the exactness the backend maintains all the way to the database.
 *
 * The currency comes from the value itself. An amount that does not say what
 * money it is in is not an amount, so a null value falls back to the currency
 * declared on the field.
 */

/**
 * Currency the editor assumes while the amount is still empty: the value's own
 * currency, then an explicit `currency` on the field, then the app-wide default
 * from `configureCore({ currency })`, and only as a last resort 'EUR'.
 */
function currencyFor(field: { currency?: string }, value: unknown): string {
  return parseMoney(value)?.currency ?? field.currency ?? getCoreCurrency() ?? 'EUR';
}

function scaleFor(field: { scale?: number }, value: unknown): number {
  return parseMoney(value)?.scale ?? field.scale ?? 2;
}

/**
 * The amount input keeps a local copy of exactly what the user typed.
 *
 * Reading the box's text straight off the parsed `amount` — the previous
 * behaviour — canonicalises "149" to "149.00" between keystrokes and drops the
 * caret past the decimals, so the next digit lands as "149.0" → "149.04": an
 * amount nobody typed. Here the field value is still upgraded to the
 * `{ amount, currency }` object as soon as the text is a complete amount; only
 * the on-screen text is left verbatim until the field blurs or the value
 * changes from outside this input (row switch, form reset, server echo).
 */
function MoneyControl({ field, value, commonProps, setFieldValue }: FieldControlProps) {
  const currency = currencyFor(field as { currency?: string }, value);
  const scale = scaleFor(field as { scale?: number }, value);

  const money: MoneyValue | null = parseMoney(value);
  const external = money ? money.amount : typeof value === 'string' ? value : '';

  const [text, setText] = useState(external);
  // What this input last pushed up. A change we caused leaves `external` equal
  // to this, so the half-typed text stands; any other change re-syncs.
  const emitted = useRef(external);

  useEffect(() => {
    if (external !== emitted.current) {
      emitted.current = external;
      setText(external);
    }
  }, [external]);

  const commit = (raw: string): void => {
    const parsed = parseMoneyInput(raw, currency, scale);
    emitted.current = parsed.ok ? parsed.value.amount : raw;
    // While the user is mid-keystroke the text is routinely not yet a valid
    // amount ("12." on the way to "12.50"), so the raw text is kept and only a
    // complete value is upgraded to the object shape.
    setFieldValue(field.name, parsed.ok ? parsed.value : raw);
  };

  return (
    <div className="nb-form__input-group nb-money">
      <input
        {...commonProps}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          commit(event.target.value);
        }}
        onBlur={() => {
          const parsed = parseMoneyInput(text, currency, scale);
          if (parsed.ok && parsed.value.amount !== text) {
            emitted.current = parsed.value.amount;
            setText(parsed.value.amount);
          }
        }}
      />
      <span className="nb-money__currency">{currency}</span>
    </div>
  );
}

export const moneyTypeModule: FieldTypeModule = {
  controlKind: 'text',
  formWidth: () => 'compact',

  defaultFilterOperator: '=',
  filterOperators: NUMERIC_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,

  cellText: (_field, value) => formatMoney(parseMoney(value)),

  /**
   * The amount arrives as a `{ amount, currency, scale }` object, and the
   * editor reads it back with `parseMoney`. Without this the generic
   * normalizer strips every object value from the row, so an edit form opens
   * with the money fields blank. Anything that is not a Money object is nulled
   * so the control shows an empty box rather than a stray string or number.
   */
  normalizeFormValue: (_field, value) => (parseMoney(value) ? KEEP : set(null)),

  /**
   * The grid filters and sorts on minor units, which is what the backend column
   * actually holds — comparing the formatted text would order "9.50" after
   * "1000.00".
   */
  serializeFormValue: (field, value) => {
    if (field.isIdentity) return KEEP;
    if (value === null || value === undefined || value === '') return OMIT;

    const existing = parseMoney(value);
    if (existing)
      return { kind: 'set', value: { amount: existing.amount, currency: existing.currency } };

    if (typeof value !== 'string') return OMIT;

    const parsed = parseMoneyInput(
      value,
      currencyFor(field as { currency?: string }, value),
      scaleFor(field as { scale?: number }, value),
    );

    // A rejected amount is left in the payload as typed so the server answers
    // with a validation error the user can act on, rather than the form
    // silently sending a different number than the one on screen.
    return parsed.ok
      ? { kind: 'set', value: { amount: parsed.value.amount, currency: parsed.value.currency } }
      : { kind: 'set', value };
  },

  serializeDetailValue: (field, value) =>
    moneyTypeModule.serializeFormValue!(field, value, undefined as never),

  ControlRender: (props) => <MoneyControl {...props} />,

  FilterCellRender: (cell) => renderDefaultFilterCell(cell, NUMERIC_OPERATORS, 'text'),

  DetailCellRender: (cell) => (
    <span className="nb-detail__money">{formatMoney(parseMoney(cell.value))}</span>
  ),
};
