import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PERIOD_PRESETS, getPeriodPreset } from './periodPresets';
import type { DashboardPeriodConfig, DashboardPeriodValue } from './types';

export const CUSTOM_PERIOD_KEY = 'custom';

export interface DashboardPeriodState {
  value: DashboardPeriodValue;
  presets: DashboardPeriodConfig['presets'];
  allowCustomRange: boolean;
  setPreset: (key: string) => void;
  setCustomRange: (start: string, end: string) => void;
}

export function useDashboardPeriod(config?: DashboardPeriodConfig): DashboardPeriodState | undefined {
  const presets = config?.presets ?? DEFAULT_PERIOD_PRESETS;
  const defaultPreset = config?.defaultPreset ?? presets[0]?.key ?? '7d';
  const allowCustomRange = config?.allowCustomRange ?? true;
  const urlParam = config?.urlParam ?? 'period';
  const [searchParams, setSearchParams] = useSearchParams();

  const presetKey = searchParams.get(urlParam) ?? defaultPreset;
  const customStart = searchParams.get(`${urlParam}_from`);
  const customEnd = searchParams.get(`${urlParam}_to`);

  const value = useMemo<DashboardPeriodValue>(() => {
    if (presetKey === CUSTOM_PERIOD_KEY && customStart && customEnd) {
      return { presetKey, start: customStart, end: customEnd };
    }
    const preset = getPeriodPreset(presetKey, presets) ?? getPeriodPreset(defaultPreset, presets);
    const range = preset?.getRange(new Date()) ?? { start: '', end: '' };
    return { presetKey: preset?.key ?? defaultPreset, ...range };
  }, [presetKey, customStart, customEnd, presets, defaultPreset]);

  const setPreset = useCallback(
    (key: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(urlParam, key);
        next.delete(`${urlParam}_from`);
        next.delete(`${urlParam}_to`);
        return next;
      });
    },
    [setSearchParams, urlParam],
  );

  const setCustomRange = useCallback(
    (start: string, end: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(urlParam, CUSTOM_PERIOD_KEY);
        if (start) next.set(`${urlParam}_from`, start);
        else next.delete(`${urlParam}_from`);
        if (end) next.set(`${urlParam}_to`, end);
        else next.delete(`${urlParam}_to`);
        return next;
      });
    },
    [setSearchParams, urlParam],
  );

  if (!config) return undefined;

  return { value, presets, allowCustomRange, setPreset, setCustomRange };
}
