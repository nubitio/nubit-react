import { formatMoney, parseMoney, parseMoneyInput } from '@nubitio/core';
import type { MoneyValue } from '@nubitio/core';
import type { FieldTypeModule } from '../FieldTypeModule';
import { renderDefaultFilterCell } from '../filterHelpers';
import { defaultBuildFilterTerms, KEEP, NUMERIC_OPERATORS, OMIT } from '../shared';

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

/** Where the editor keeps the currency while the user is typing a new amount. */
function currencyFor(field: { currency?: string }, value: unknown): string {
  return parseMoney(value)?.currency ?? field.currency ?? 'EUR';
}

function scaleFor(field: { scale?: number }, value: unknown): number {
  return parseMoney(value)?.scale ?? field.scale ?? 2;
}

export const moneyTypeModule: FieldTypeModule = {
  controlKind: 'text',
  formWidth: () => 'compact',

  defaultFilterOperator: '=',
  filterOperators: NUMERIC_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,

  cellText: (_field, value) => formatMoney(parseMoney(value)),

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

  ControlRender: ({ field, value, commonProps, setFieldValue }) => {
    const money: MoneyValue | null = parseMoney(value);
    const text = money ? money.amount : typeof value === 'string' ? value : '';

    return (
      <div className="nb-form__input-group nb-money">
        <input
          {...commonProps}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(event) => {
            const raw = event.target.value;
            const parsed = parseMoneyInput(
              raw,
              currencyFor(field as { currency?: string }, value),
              scaleFor(field as { scale?: number }, value),
            );

            // While the user is mid-keystroke the text is routinely not yet a
            // valid amount ("12." on the way to "12.50"), so the raw text is
            // kept and only a complete value is upgraded to the object shape.
            setFieldValue(field.name, parsed.ok ? parsed.value : raw);
          }}
        />
        <span className="nb-money__currency">
          {currencyFor(field as { currency?: string }, value)}
        </span>
      </div>
    );
  },

  FilterCellRender: (cell) => renderDefaultFilterCell(cell, NUMERIC_OPERATORS, 'text'),

  DetailCellRender: (cell) => (
    <span className="nb-detail__money">{formatMoney(parseMoney(cell.value))}</span>
  ),
};
