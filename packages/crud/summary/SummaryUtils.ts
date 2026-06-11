import { getCoreCurrency, getCoreLocale } from '@nubitio/core';
import type { DataRecord } from '@nubitio/core';
import type { SummaryItem, SummaryTextContext } from './SummaryTypes';

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
  if (type === 'count') return item.column ? rows.filter((row) => row[item.column!] !== null && row[item.column!] !== undefined).length : rows.length;

  const values = numericColumnValues(rows, item.column);
  if (values.length === 0) return 0;

  if (type === 'avg') return values.reduce((total, next) => total + next, 0) / values.length;
  if (type === 'min') return Math.min(...values);
  if (type === 'max') return Math.max(...values);
  return values.reduce((total, next) => total + next, 0);
}

export function formatSummaryValue(value: unknown, item: SummaryItem): string {
  if (typeof item.valueFormat === 'function') return item.valueFormat(value, item);

  if (typeof value !== 'number') return value == null ? '' : String(value);

  const precision = item.precision ?? (item.valueFormat === 'currency' || item.valueFormat === 'fixedPoint' ? 2 : undefined);
  const baseOptions: Intl.NumberFormatOptions = {
    ...(precision !== undefined ? { minimumFractionDigits: precision, maximumFractionDigits: precision } : undefined),
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
    return new Intl.NumberFormat(getCoreLocale(), { ...baseOptions, style: 'percent' }).format(value);
  }

  if (item.valueFormat && typeof item.valueFormat === 'object') {
    return new Intl.NumberFormat(getCoreLocale(), item.valueFormat).format(value);
  }

  if (item.valueFormat === 'fixedPoint' || item.valueFormat === 'decimal') {
    return new Intl.NumberFormat(getCoreLocale(), baseOptions).format(value);
  }

  return String(value);
}

export function resolveSummaryText(rows: DataRecord[], item: SummaryItem): string {
  const value = computeSummaryValue(rows, item);
  const valueText = formatSummaryValue(value, item);
  const context: SummaryTextContext = { value, valueText, item };

  if (item.customizeText) return item.customizeText(context);
  if (item.displayFormat) return item.displayFormat.replace('{0}', valueText);
  return valueText;
}
