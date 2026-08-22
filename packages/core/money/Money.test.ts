import { describe, expect, it } from 'vitest';
import {
  formatMinorUnits,
  formatMoney,
  fromMinorUnits,
  parseMoney,
  parseMoneyInput,
  sumMoney,
  toMinorUnits,
} from './Money';

const eur = (amount: string) => ({ amount, currency: 'EUR', scale: 2 });

describe('parseMoney', () => {
  it('reads the wire shape', () => {
    expect(parseMoney({ amount: '19.99', currency: 'EUR', scale: 2, minorAmount: 1999 })).toEqual({
      amount: '19.99',
      currency: 'EUR',
      scale: 2,
      minorAmount: 1999,
    });
  });

  it('uppercases the currency code', () => {
    expect(parseMoney({ amount: '1.00', currency: 'eur', scale: 2 })?.currency).toBe('EUR');
  });

  // A grid renders thousands of cells; one bad row must not take the page down.
  it.each([
    ['null', null],
    ['a bare number', 42],
    ['a bare string', '19.99'],
    ['a missing currency', { amount: '19.99' }],
    ['a non-numeric amount', { amount: 'abc', currency: 'EUR', scale: 2 }],
    ['an amount sent as a number', { amount: 19.99, currency: 'EUR', scale: 2 }],
    ['a malformed currency', { amount: '1.00', currency: 'EUROS', scale: 2 }],
  ])('returns null for %s', (_label, raw) => {
    expect(parseMoney(raw)).toBeNull();
  });
});

describe('exact arithmetic', () => {
  it('converts to minor units without going through a float', () => {
    expect(toMinorUnits(eur('19.99'))).toBe(1999n);
    expect(toMinorUnits(eur('-4.50'))).toBe(-450n);
    expect(toMinorUnits({ amount: '1999', currency: 'JPY', scale: 0 })).toBe(1999n);
  });

  it('survives amounts beyond what a double holds exactly', () => {
    // 2^53 minor units and one more: a JSON number cannot tell these apart.
    const huge = { amount: '90071992547409.93', currency: 'EUR', scale: 2 };
    expect(toMinorUnits(huge)).toBe(9007199254740993n);
    expect(fromMinorUnits(9007199254740993n, 'EUR', 2).amount).toBe('90071992547409.93');
  });

  it('adds tenths exactly', () => {
    expect(sumMoney([eur('0.10'), eur('0.20')])?.amount).toBe('0.30');
  });

  it('sums a long list without drift', () => {
    const values = Array.from({ length: 1000 }, () => eur('0.01'));
    expect(sumMoney(values)?.amount).toBe('10.00');
  });

  // Adding euros to dollars is worse than showing nothing: it looks right.
  it('refuses to add different currencies', () => {
    expect(sumMoney([eur('1.00'), { amount: '1.00', currency: 'USD', scale: 2 }])).toBeNull();
  });

  it('refuses to add the same code at different scales', () => {
    expect(sumMoney([eur('1.00'), { amount: '1.000', currency: 'EUR', scale: 3 }])).toBeNull();
  });

  it('returns null for an empty list rather than inventing a currency', () => {
    expect(sumMoney([])).toBeNull();
  });

  it('formats minor units back to a decimal literal', () => {
    expect(formatMinorUnits(1999n, 2)).toBe('19.99');
    expect(formatMinorUnits(-5n, 2)).toBe('-0.05');
    expect(formatMinorUnits(1999n, 0)).toBe('1999');
    expect(formatMinorUnits(1n, 8)).toBe('0.00000001');
  });
});

describe('formatMoney', () => {
  it('formats in the given locale without losing a digit', () => {
    expect(formatMoney(eur('1234567.89'), { locale: 'en-US' })).toBe('1,234,567.89');
    expect(formatMoney(eur('1234567.89'), { locale: 'de-DE' })).toBe('1.234.567,89');
  });

  it('keeps the currency scale', () => {
    expect(formatMoney({ amount: '1999', currency: 'JPY', scale: 0 }, { locale: 'en-US' })).toBe(
      '1,999',
    );
  });

  it('shows the currency when asked', () => {
    expect(formatMoney(eur('19.99'), { locale: 'en-US', showCurrency: true })).toContain('19.99');
    expect(formatMoney(eur('19.99'), { locale: 'en-US', showCurrency: true })).toContain('€');
  });

  it('still shows the amount when the currency code is unknown to Intl', () => {
    expect(
      formatMoney(
        { amount: '1.00', currency: 'XXY', scale: 2 },
        { locale: 'en-US', showCurrency: true },
      ),
    ).toContain('1.00');
  });

  it('renders nothing for an absent amount', () => {
    expect(formatMoney(null)).toBe('');
    expect(formatMoney(undefined)).toBe('');
  });
});

describe('parseMoneyInput', () => {
  it('accepts the canonical form', () => {
    const result = parseMoneyInput('1234.56', 'EUR', 2, 'en-US');
    expect(result).toEqual({ ok: true, value: eur('1234.56') });
  });

  it('accepts locale separators', () => {
    expect(parseMoneyInput('1.234,56', 'EUR', 2, 'de-DE')).toEqual({
      ok: true,
      value: eur('1234.56'),
    });
    expect(parseMoneyInput('1,234.56', 'EUR', 2, 'en-US')).toEqual({
      ok: true,
      value: eur('1234.56'),
    });
  });

  it('pads a short fraction to the currency scale', () => {
    expect(parseMoneyInput('5.5', 'EUR', 2, 'en-US')).toEqual({ ok: true, value: eur('5.50') });
    expect(parseMoneyInput('5', 'EUR', 2, 'en-US')).toEqual({ ok: true, value: eur('5.00') });
  });

  it('handles negatives', () => {
    expect(parseMoneyInput('-5.50', 'EUR', 2, 'en-US')).toEqual({ ok: true, value: eur('-5.50') });
  });

  // Dropping a digit the user typed changes the value they believe they entered.
  it('rejects more decimals than the currency has', () => {
    expect(parseMoneyInput('5.555', 'EUR', 2, 'en-US')).toEqual({
      ok: false,
      reason: 'too-precise',
    });
    expect(parseMoneyInput('5.5', 'JPY', 0, 'en-US')).toEqual({ ok: false, reason: 'too-precise' });
  });

  it.each(['', '   ', 'abc', '1.2.3', '1e3', '--5'])('rejects %o', (text) => {
    expect(parseMoneyInput(text, 'EUR', 2, 'en-US')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('round-trips through formatting', () => {
    const parsed = parseMoneyInput('9876.54', 'EUR', 2, 'en-US');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(formatMoney(parsed.value, { locale: 'en-US' })).toBe('9,876.54');
  });
});
