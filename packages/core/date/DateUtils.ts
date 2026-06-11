import { getCoreTimezone, getCoreLocale } from '../config/CoreConfig';

/**
 * Recommended default for new projects using @nubit/core.
 * You should almost always override this via CoreConfigProvider.
 */
export const DEFAULT_TIMEZONE = 'UTC';

function coreDateParts(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: getCoreTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parseInt(parts.find((part) => part.type === type)!.value, 10);

  return { year: get('year'), month: get('month'), day: get('day') };
}

export class DateUtils {
  static dateFormatter(date: Date): string {
    const { year, month, day } = coreDateParts(date);
    return `${year}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
  }

  static dateParser(dateString: string): Date {
    if (!dateString) return new Date();
    const dateParts = dateString.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);

    if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
      return new Date(year, month - 1, day);
    }

    return new Date();
  }

  static format(dateString: string, formatOptions?: Intl.DateTimeFormatOptions): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(getCoreLocale(), {
      timeZone: getCoreTimezone(),
      ...(formatOptions ?? { day: 'numeric', month: 'short', year: 'numeric' }),
    });
  }

  static addDays(fieldValue: string | number | Date, days: number): Date {
    const date = new Date(fieldValue);
    date.setDate(date.getDate() + days);
    return date;
  }

  static addMonths(fieldValue: string | number | Date, months: number): Date {
    const date = new Date(fieldValue);
    date.setMonth(date.getMonth() + months);
    return date;
  }

  static addYears(fieldValue: string | number | Date, years: number): Date {
    const date = new Date(fieldValue);
    date.setFullYear(date.getFullYear() + years);
    return date;
  }

  static dayDiff(startDate: string | number | Date, endDate: string | number | Date): number {
    const dateStart = new Date(startDate);
    const dateEnd = new Date(endDate);
    const timeDiff = Math.abs(dateEnd.getTime() - dateStart.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  static monthDiff(startDate: string | number | Date, endDate: string | number | Date): number {
    const dateStart = new Date(startDate);
    const dateEnd = new Date(endDate);
    let months = (dateEnd.getFullYear() - dateStart.getFullYear()) * 12;
    months -= dateStart.getMonth();
    months += dateEnd.getMonth();
    return months <= 0 ? 0 : months;
  }
}
