import type { DashboardPeriodPreset } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function daysAgo(today: Date, days: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

export const DEFAULT_PERIOD_PRESETS: DashboardPeriodPreset[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: (today) => ({ start: toIso(today), end: toIso(today) }),
  },
  {
    key: '7d',
    label: '7d',
    getRange: (today) => ({ start: toIso(daysAgo(today, 6)), end: toIso(today) }),
  },
  {
    key: '30d',
    label: '30d',
    getRange: (today) => ({ start: toIso(daysAgo(today, 29)), end: toIso(today) }),
  },
  {
    key: 'month',
    label: 'This month',
    getRange: (today) => ({ start: toIso(startOfMonth(today)), end: toIso(today) }),
  },
  {
    key: 'year',
    label: 'This year',
    getRange: (today) => ({ start: toIso(startOfYear(today)), end: toIso(today) }),
  },
];

export function getPeriodPreset(
  key: string,
  presets: DashboardPeriodPreset[] = DEFAULT_PERIOD_PRESETS,
): DashboardPeriodPreset | undefined {
  return presets.find((preset) => preset.key === key);
}
