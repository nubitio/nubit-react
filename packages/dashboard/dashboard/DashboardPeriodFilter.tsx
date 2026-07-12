import { DateRangePicker, SegmentedControl } from '@nubitio/ui';
import { CUSTOM_PERIOD_KEY, type DashboardPeriodState } from './useDashboardPeriod';

export function DashboardPeriodFilter({ period }: { period: DashboardPeriodState }) {
  const { value, presets = [], allowCustomRange, setPreset, setCustomRange } = period;
  const options = [
    ...presets.map((preset) => ({ value: preset.key, label: preset.label })),
    ...(allowCustomRange ? [{ value: CUSTOM_PERIOD_KEY, label: 'Custom' }] : []),
  ];
  const isCustom = value.presetKey === CUSTOM_PERIOD_KEY;

  return (
    <div className="nb-dashboard-period-filter">
      <SegmentedControl
        ariaLabel="Period"
        size="sm"
        options={options}
        value={value.presetKey}
        onChange={setPreset}
      />
      {isCustom && (
        <DateRangePicker
          startValue={value.start}
          endValue={value.end}
          onChange={setCustomRange}
          ariaLabel="Custom period"
        />
      )}
    </div>
  );
}
