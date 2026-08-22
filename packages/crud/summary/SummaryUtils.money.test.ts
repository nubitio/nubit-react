import { describe, expect, it } from 'vitest';
import { computeSummaryValue, resolveSummaryText } from './SummaryUtils';
import type { SummaryItem } from './SummaryTypes';

const money = (amount: string, currency = 'EUR', scale = 2) => ({ amount, currency, scale });

const sumItem: SummaryItem = { column: 'total', summaryType: 'sum' };

describe('money summaries', () => {
  // The footer is the number a user checks against another system, so it has
  // to equal what the database holds, not a float approximation of it.
  it('sums exactly where a float would drift', () => {
    const rows = [{ total: money('0.10') }, { total: money('0.20') }];

    expect(computeSummaryValue(rows, sumItem)).toEqual(money('0.30'));
  });

  it('sums a long list without accumulating error', () => {
    const rows = Array.from({ length: 1000 }, () => ({ total: money('0.01') }));

    expect(computeSummaryValue(rows, sumItem)).toEqual(money('10.00'));
  });

  it('survives amounts beyond a double', () => {
    const rows = [{ total: money('90071992547409.92') }, { total: money('0.01') }];

    expect(computeSummaryValue(rows, sumItem)).toEqual(money('90071992547409.93'));
  });

  it('skips empty cells', () => {
    const rows = [{ total: money('1.00') }, { total: null }, { total: money('2.00') }];

    expect(computeSummaryValue(rows, sumItem)).toEqual(money('3.00'));
  });

  // A footer adding euros to dollars is worse than an empty one: it looks right.
  it('refuses to total mixed currencies', () => {
    const rows = [{ total: money('1.00') }, { total: money('1.00', 'USD') }];

    expect(computeSummaryValue(rows, sumItem)).toBeNull();
  });

  it('compares min and max in minor units, not as text', () => {
    const rows = [
      { total: money('9.50') },
      { total: money('1000.00') },
      { total: money('100.00') },
    ];

    expect(computeSummaryValue(rows, { column: 'total', summaryType: 'min' })).toEqual(
      money('9.50'),
    );
    expect(computeSummaryValue(rows, { column: 'total', summaryType: 'max' })).toEqual(
      money('1000.00'),
    );
  });

  // The grouping and decimal separators follow the configured locale, so the
  // assertion is about what must survive formatting: the currency, and every
  // digit of the amount.
  it('formats the total with the currency when asked', () => {
    const rows = [{ total: money('1234.50') }];

    const text = resolveSummaryText(rows, {
      column: 'total',
      summaryType: 'sum',
      valueFormat: 'currency',
    });

    expect(text).toContain('€');
    expect(text.replace(/[^0-9]/g, '')).toBe('123450');
  });

  it('leaves plain numeric columns on the numeric path', () => {
    const rows = [{ total: 1.5 }, { total: 2.5 }];

    expect(computeSummaryValue(rows, sumItem)).toBe(4);
  });
});
