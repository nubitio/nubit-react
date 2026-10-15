import { parseDate } from '@internationalized/date';

export const getDateLocale = (locale?: string) =>
  locale ||
  (typeof document !== 'undefined' && document.documentElement.lang) ||
  (typeof navigator !== 'undefined' && navigator.language) ||
  'en-US';
export const calendarDate = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  try {
    return parseDate(value);
  } catch {
    return null;
  }
};
export const formatDate = (value: string | null | undefined, locale: string) => {
  const date = calendarDate(value);
  return date
    ? new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date.toDate('UTC'))
    : '';
};
export const dateAllowed = (value: string, min?: string, max?: string) =>
  Boolean(calendarDate(value)) && (!min || value >= min) && (!max || value <= max);
/**
 * Locale-aware first day of week.
 * Uses Intl.Locale.weekInfo (Chrome 99+, FF 126+, Safari 17+) with fallback heuristic.
 */
export const getFirstDayOfWeek = (locale?: string): number => {
  try {
    // @ts-expect-error — weekInfo is stage-4, not yet in TS lib
    const info = new Intl.Locale(getDateLocale(locale)).weekInfo;
    if (info && typeof info.firstDay === 'number') return info.firstDay === 7 ? 0 : info.firstDay;
  } catch {
    /* ignore */
  }
  const country = (getDateLocale(locale).split('-')[1] ?? '').toUpperCase();
  const sundayCountries = ['US', 'CA', 'MX', 'CN', 'JP', 'KR', 'SA', 'EG', 'IL', 'BR'];
  return sundayCountries.includes(country) ? 0 : 1;
};

export const weekDayLabels = (locale?: string): string[] => {
  const firstDayOfWeek = getFirstDayOfWeek(locale);
  const anchor = new Date(2026, 5, 7); // Known Sunday
  const formatter = new Intl.DateTimeFormat(getDateLocale(locale), { weekday: 'narrow' });
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + ((firstDayOfWeek + i) % 7));
    return formatter.format(date);
  });
};

const dateOrder = (locale?: string) =>
  new Intl.DateTimeFormat(getDateLocale(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .formatToParts(new Date(Date.UTC(2026, 10, 23)))
    .filter((part) => ['day', 'month', 'year'].includes(part.type))
    .map((part) => part.type);

export const datePlaceholder = (locale?: string) =>
  dateOrder(locale)
    .map((part) => (part === 'year' ? 'yyyy' : part === 'month' ? 'mm' : 'dd'))
    .join('/');

export const applyDateMask = (rawValue: string, prevValue: string, locale?: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return rawValue;
  const digits = rawValue.replace(/\D/g, '').slice(0, 8);
  const adding = digits.length > prevValue.replace(/\D/g, '').length;
  const sizes = dateOrder(locale ?? 'es-PE').map((part) => (part === 'year' ? 4 : 2));
  let offset = 0;
  let result = '';
  for (const [i, size] of sizes.entries()) {
    result += digits.slice(offset, offset + size);
    offset += size;
    if (i < 2 && (digits.length > offset || (adding && digits.length === offset))) result += '/';
  }
  return result;
};

export const parseDisplayDate = (text: string, locale?: string): string | null => {
  if (calendarDate(text)) return text;
  const order = dateOrder(locale);
  const digits = text.match(/\d+/g);
  if (!digits || digits.length !== 3) return null;
  const fields = Object.fromEntries(order.map((key, i) => [key, digits[i]]));
  if (fields.year?.length !== 4) return null;
  const iso = `${fields.year}-${fields.month?.padStart(2, '0')}-${fields.day?.padStart(2, '0')}`;
  return calendarDate(iso) ? iso : null;
};
