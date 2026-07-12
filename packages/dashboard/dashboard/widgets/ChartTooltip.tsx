import { formatDashboardValue } from '../formatValue';
import type { ChartSeriesConfig, ValueFormat } from '../types';

interface TooltipPayloadItem {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
}

type Props = {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
  labelFormat?: ValueFormat;
  series?: ChartSeriesConfig[];
};

export function ChartTooltip({ active, label, payload, labelFormat, series }: Props) {
  if (!active || !payload?.length) return null;

  return (
    <div className="nb-dashboard-chart-tooltip">
      {label !== undefined && <div className="nb-dashboard-chart-tooltip__label">{label}</div>}
      <ul className="nb-dashboard-chart-tooltip__items">
        {payload.map((item) => {
          const seriesConfig = series?.find((s) => s.key === item.dataKey);
          return (
            <li key={String(item.dataKey)} className="nb-dashboard-chart-tooltip__item">
              <span className="nb-dashboard-chart-tooltip__swatch" style={{ background: item.color }} />
              <span className="nb-dashboard-chart-tooltip__name">{item.name}</span>
              <span className="nb-dashboard-chart-tooltip__value">
                {formatDashboardValue(item.value, seriesConfig?.valueFormat ?? labelFormat)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
