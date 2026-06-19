import { getCoreCurrency, getCoreLocale } from '@nubitio/core';
import type { ValueFormat } from './types';

export function formatDashboardValue(value: unknown, format: ValueFormat = 'text'): string {
  if (value === null || value === undefined) return '—';

  if (format === 'text') return String(value);

  if (format === 'date' || format === 'datetime') {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(getCoreLocale(), {
      dateStyle: format === 'date' ? 'medium' : undefined,
      timeStyle: format === 'datetime' ? 'short' : undefined,
    }).format(date);
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);

  const baseOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: format === 'currency' ? 2 : undefined,
    maximumFractionDigits: format === 'currency' ? 2 : undefined,
  };

  if (format === 'currency') {
    const currency = getCoreCurrency();
    if (!currency) {
      return new Intl.NumberFormat(getCoreLocale(), baseOptions).format(numeric);
    }
    return new Intl.NumberFormat(getCoreLocale(), {
      ...baseOptions,
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(numeric);
  }

  if (format === 'percent') {
    const normalized = Math.abs(numeric) <= 1 ? numeric : numeric / 100;
    return new Intl.NumberFormat(getCoreLocale(), {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(normalized);
  }

  return new Intl.NumberFormat(getCoreLocale()).format(numeric);
}