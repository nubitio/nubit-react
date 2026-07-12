import { describe, expect, it } from 'vitest';
import { DEFAULT_PERIOD_PRESETS, getPeriodPreset } from './periodPresets';

const today = new Date(2026, 5, 15); // 2026-06-15

describe('DEFAULT_PERIOD_PRESETS', () => {
  it('today spans a single day', () => {
    const preset = getPeriodPreset('today')!;
    expect(preset.getRange(today)).toEqual({ start: '2026-06-15', end: '2026-06-15' });
  });

  it('7d spans the trailing 7 days inclusive of today', () => {
    const preset = getPeriodPreset('7d')!;
    expect(preset.getRange(today)).toEqual({ start: '2026-06-09', end: '2026-06-15' });
  });

  it('30d spans the trailing 30 days inclusive of today', () => {
    const preset = getPeriodPreset('30d')!;
    expect(preset.getRange(today)).toEqual({ start: '2026-05-17', end: '2026-06-15' });
  });

  it('month spans from the 1st of the current month to today', () => {
    const preset = getPeriodPreset('month')!;
    expect(preset.getRange(today)).toEqual({ start: '2026-06-01', end: '2026-06-15' });
  });

  it('year spans from Jan 1st of the current year to today', () => {
    const preset = getPeriodPreset('year')!;
    expect(preset.getRange(today)).toEqual({ start: '2026-01-01', end: '2026-06-15' });
  });
});

describe('getPeriodPreset', () => {
  it('returns undefined for unknown keys', () => {
    expect(getPeriodPreset('unknown')).toBeUndefined();
  });

  it('looks up within a custom preset list', () => {
    const custom = [{ key: 'x', label: 'X', getRange: () => ({ start: 'a', end: 'b' }) }];
    expect(getPeriodPreset('x', custom)).toBe(custom[0]);
  });
});

describe('DEFAULT_PERIOD_PRESETS list', () => {
  it('exposes stable, unique keys', () => {
    const keys = DEFAULT_PERIOD_PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
