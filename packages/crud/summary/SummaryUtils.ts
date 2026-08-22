import {
  formatMoney,
  getCoreCurrency,
  getCoreLocale,
  parseMoney,
  sumMoney,
  toMinorUnits,
} from '@nubitio/core';
import type { DataRecord, MoneyValue } from '@nubitio/core';
import type { SummaryItem, SummaryTextContext } from './SummaryTypes';

/**
 * Money columns are aggregated exactly, in integer minor units.
 *
 * The generic numeric path below converts every cell with `Number()`, and a
 * footer built that way drifts from the total the database holds — the one
 * number in a grid a user is most likely to check against another system.
 * Returning null here means the column is not money and the numeric path
 * applies as before.
 */
function moneyColumnValues(rows: DataRecord[], column?: string): MoneyValue[] | null {
  if (!column) return null;

  const values: MoneyValue[] = [];
  for (const row of rows) {
    const raw = row[column];
    if (raw === null || raw === undefined) continue;

    const money = parseMoney(raw);
    if (!money) return null;
    values.push(money);
  }

  return values.length > 0 ? values : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function numericColumnValues(rows: DataRecord[], column?: string): number[] {
  if (!column) return [];
  return rows
    .map((row) => toFiniteNumber(row[column]))
    .filter((value): value is number => value !== null);
}

export function computeSummaryValue(rows: DataRecord[], item: SummaryItem): unknown {
  if (typeof item.summaryType === 'function') {
    return item.summaryType({ rows, column: item.column, item });
  }

  const type = item.summaryType ?? 'sum';
  if (type === 'custom') return undefined;
  if (type === 'count')
    return item.column
      ? rows.filter((row) => row[item.column!] !== null && row[item.column!] !== undefined).length
      : rows.length;

  const money = moneyColumnValues(rows, item.column);
  if (money) {
    // min/max compare in minor units so 9.50 does not sort above 1000.00.
    if (type === 'sum') return sumMoney(money);
    if (type === 'min') return extremeMoney(money, -1);
    if (type === 'max') return extremeMoney(money, 1);
    // An average is a division, and dividing money needs a rounding decision
    // the grid has no business making silently. It falls through to the
    // numeric path, which is explicit about being approximate.
  }

  const values = numericColumnValues(rows, item.column);
  if (values.length === 0) return 0;

  if (type === 'avg') return values.reduce((total, next) => total + next, 0) / values.length;
  if (type === 'min') return Math.min(...values);
  if (type === 'max') return Math.max(...values);
  return values.reduce((total, next) => total + next, 0);
}

export function formatSummaryValue(value: unknown, item: SummaryItem): string {
  if (typeof item.valueFormat === 'function') return item.valueFormat(value, item);

  const money = parseMoney(value);
  if (money) {
    return formatMoney(money, { showCurrency: item.valueFormat === 'currency' });
  }

  if (typeof value !== 'number') return value == null ? '' : String(value);

  const precision =
    item.precision ??
    (item.valueFormat === 'currency' || item.valueFormat === 'fixedPoint' ? 2 : undefined);
  const baseOptions: Intl.NumberFormatOptions = {
    ...(precision !== undefined
      ? { minimumFractionDigits: precision, maximumFractionDigits: precision }
      : undefined),
  };

  if (item.valueFormat === 'currency') {
    // Resolution order: explicit item currency → app-wide CoreConfig currency.
    // A public library must not assume a country: with neither configured,
    // fall back to plain fixed-point formatting (no symbol).
    const currency = item.currency ?? getCoreCurrency();
    if (currency === undefined) {
      return new Intl.NumberFormat(getCoreLocale(), baseOptions).format(value);
    }
    return new Intl.NumberFormat(getCoreLocale(), {
      ...baseOptions,
      style: 'currency',
      currency,
      currencyDisplay: item.currencyDisplay ?? 'narrowSymbol',
    }).format(value);
  }

  if (item.valueFormat === 'percent') {
    return new Intl.NumberFormat(getCoreLocale(), { ...baseOptions, style: 'percent' }).format(
      value,
    );
  }

  if (item.valueFormat && typeof item.valueFormat === 'object') {
    return new Intl.NumberFormat(getCoreLocale(), item.valueFormat).format(value);
  }

  if (item.valueFormat === 'fixedPoint' || item.valueFormat === 'decimal') {
    return new Intl.NumberFormat(getCoreLocale(), baseOptions).format(value);
  }

  return String(value);
}

/** Picks the smallest or largest amount, comparing exactly rather than as text. */
function extremeMoney(values: MoneyValue[], direction: 1 | -1): MoneyValue | null {
  const first = values[0];
  if (values.some((value) => value.currency !== first.currency || value.scale !== first.scale)) {
    return null;
  }

  return values.reduce((chosen, candidate) => {
    const chosenMinor = toMinorUnits(chosen);
    const candidateMinor = toMinorUnits(candidate);
    const isBetter = direction === 1 ? candidateMinor > chosenMinor : candidateMinor < chosenMinor;
    return isBetter ? candidate : chosen;
  }, first);
}

export function resolveSummaryText(rows: DataRecord[], item: SummaryItem): string {
  const value = computeSummaryValue(rows, item);
  const valueText = formatSummaryValue(value, item);
  const context: SummaryTextContext = { value, valueText, item };

  if (item.customizeText) return item.customizeText(context);
  if (item.displayFormat) return item.displayFormat.replace('{0}', valueText);
  return valueText;
}
