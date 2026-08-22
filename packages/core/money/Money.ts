import { getCoreLocale } from '../config/CoreConfig';

/**
 * A monetary amount as the API publishes it.
 *
 * `amount` is the authority. `minorAmount` arrives as a JSON number and is kept
 * for convenience, but nothing here computes from it: a JSON number is an
 * IEEE-754 double in every JavaScript runtime, so past 2^53 minor units it is
 * already approximate. Every operation below parses the decimal string into a
 * BigInt instead, which is exact at any size.
 */
export interface MoneyValue {
  /** Decimal literal in major units, e.g. "1234567.89". */
  readonly amount: string;
  /** ISO-4217 code, e.g. "EUR". */
  readonly currency: string;
  /** Decimal places the currency has: 2 for EUR, 0 for JPY, 3 for KWD. */
  readonly scale: number;
  /** Amount in minor units, as sent by the API. Informational only. */
  readonly minorAmount?: number;
}

const DECIMAL_PATTERN = /^[+-]?\d+(\.\d+)?$/;

/**
 * Reads a value coming off the wire.
 *
 * Returns null rather than throwing for anything unrecognised: a grid renders
 * thousands of cells, and one malformed row must not take the page down.
 */
export function parseMoney(raw: unknown): MoneyValue | null {
  if (raw === null || raw === undefined) return null;

  if (typeof raw !== 'object') return null;

  const candidate = raw as Record<string, unknown>;
  const { amount, currency, scale } = candidate;

  if (typeof amount !== 'string' || !DECIMAL_PATTERN.test(amount)) return null;
  if (typeof currency !== 'string' || currency.length !== 3) return null;

  const resolvedScale =
    typeof scale === 'number' && Number.isInteger(scale) && scale >= 0 ? scale : decimalsOf(amount);

  return {
    amount,
    currency: currency.toUpperCase(),
    scale: resolvedScale,
    minorAmount: typeof candidate.minorAmount === 'number' ? candidate.minorAmount : undefined,
  };
}

export function isMoneyValue(raw: unknown): raw is MoneyValue {
  return parseMoney(raw) !== null;
}

/** Exact minor units, computed from the decimal string rather than trusted from the wire. */
export function toMinorUnits(value: MoneyValue): bigint {
  const negative = value.amount.startsWith('-');
  const digits = value.amount.replace(/^[+-]/, '');
  const [integerPart, fractionPart = ''] = digits.split('.');

  const padded = fractionPart.padEnd(value.scale, '0').slice(0, value.scale);
  const combined = `${integerPart}${padded}` || '0';

  const magnitude = BigInt(combined);

  return negative ? -magnitude : magnitude;
}

export function fromMinorUnits(minor: bigint, currency: string, scale: number): MoneyValue {
  return {
    amount: formatMinorUnits(minor, scale),
    currency: currency.toUpperCase(),
    scale,
  };
}

/** Renders an exact integer count of minor units as a decimal literal. */
export function formatMinorUnits(minor: bigint, scale: number): string {
  if (scale === 0) return minor.toString();

  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(scale + 1, '0');

  const integerPart = digits.slice(0, digits.length - scale);
  const fractionPart = digits.slice(digits.length - scale);

  return `${negative ? '-' : ''}${integerPart}.${fractionPart}`;
}

/**
 * Adds a list of amounts exactly.
 *
 * Mixed currencies produce null rather than a wrong total: a grid footer that
 * adds euros to dollars is worse than one that shows nothing, because it looks
 * right.
 */
export function sumMoney(values: readonly MoneyValue[]): MoneyValue | null {
  if (values.length === 0) return null;

  const [first] = values;
  let total = 0n;

  for (const value of values) {
    if (value.currency !== first.currency || value.scale !== first.scale) return null;
    total += toMinorUnits(value);
  }

  return fromMinorUnits(total, first.currency, first.scale);
}

export interface FormatMoneyOptions {
  locale?: string;
  /** Show the currency symbol or code. Off for grid cells, on for totals. */
  showCurrency?: boolean;
}

/**
 * Formats for display, in the viewer's locale.
 *
 * The decimal string is handed to Intl directly. Converting to a number first
 * would round the value before it is ever shown — the one place where the drift
 * would be visible and blamed on the database.
 */
export function formatMoney(
  value: MoneyValue | null | undefined,
  options: FormatMoneyOptions = {},
): string {
  if (!value) return '';

  const locale = options.locale ?? getCoreLocale();
  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: value.scale,
    maximumFractionDigits: value.scale,
    ...(options.showCurrency ? { style: 'currency', currency: value.currency } : {}),
  };

  try {
    // Intl.NumberFormat V3 accepts a decimal string and formats it exactly.
    return new Intl.NumberFormat(locale, formatOptions).format(value.amount as unknown as number);
  } catch {
    // An unknown currency code makes `style: 'currency'` throw; the amount is
    // still worth showing.
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: value.scale,
      maximumFractionDigits: value.scale,
    }).format(value.amount as unknown as number);
  }
}

/**
 * Turns what a user typed into an amount.
 *
 * Accepts the separators of the active locale as well as plain "1234.56", since
 * both reach a form: one from typing, the other from a paste. Returns null when
 * the text is not a number, and a rejection when it carries more decimals than
 * the currency has — silently dropping a digit the user typed would change the
 * value they think they entered.
 */
export function parseMoneyInput(
  text: string,
  currency: string,
  scale: number,
  locale: string = getCoreLocale(),
): { ok: true; value: MoneyValue } | { ok: false; reason: 'invalid' | 'too-precise' } {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, reason: 'invalid' };

  const normalized = normalizeSeparators(trimmed, locale);
  if (!DECIMAL_PATTERN.test(normalized)) return { ok: false, reason: 'invalid' };

  if (decimalsOf(normalized) > scale) return { ok: false, reason: 'too-precise' };

  const negative = normalized.startsWith('-');
  const digits = normalized.replace(/^[+-]/, '');
  const [integerPart, fractionPart = ''] = digits.split('.');
  const minor = BigInt(`${integerPart}${fractionPart.padEnd(scale, '0')}`);

  return { ok: true, value: fromMinorUnits(negative ? -minor : minor, currency, scale) };
}

/**
 * Rewrites locale separators into the canonical form.
 *
 * "1.234,56" and "1,234.56" are the same amount written for different readers.
 * The decimal separator is taken from the locale rather than guessed, because
 * guessing turns "1.234" into either 1234 or 1.234 depending on the reader.
 */
function normalizeSeparators(text: string, locale: string): string {
  const decimalSeparator =
    new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')
      ?.value ?? '.';
  const groupSeparator = decimalSeparator === ',' ? '.' : ',';

  return text.split(groupSeparator).join('').replace(/\s/g, '').split(decimalSeparator).join('.');
}

function decimalsOf(decimal: string): number {
  const index = decimal.indexOf('.');
  return index === -1 ? 0 : decimal.length - index - 1;
}
