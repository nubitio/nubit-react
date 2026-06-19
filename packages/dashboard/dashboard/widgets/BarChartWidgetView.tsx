import { StatCard } from '@nubitio/ui';
import { formatDashboardValue } from '../formatValue';
import { resolveArray } from '../resolvePath';
import type { BarChartWidgetConfig } from '../types';

type Props = {
  widget: BarChartWidgetConfig;
  data: Record<string, unknown>;
  loading?: boolean;
};

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function BarChartWidgetView({ widget, data, loading }: Props) {
  const rows = resolveArray(data, widget.dataPath);
  const max = rows.reduce((peak, row) => Math.max(peak, toNumber(row[widget.yKey])), 0) || 1;
  const height = widget.height ?? 200;

  return (
    <StatCard
      title={widget.title}
      headerExtra={widget.subtitle ? <span className="nb-dashboard-widget__subtitle">{widget.subtitle}</span> : undefined}
      menuVisible={widget.menuVisible}
      isLoading={loading}
      className="nb-dashboard-chart-card"
    >
      {rows.length === 0 ? (
        <div className="nb-dashboard-chart-empty">No data</div>
      ) : (
        <div className="nb-dashboard-bar-chart" style={{ height }} role="img" aria-label={widget.title}>
          {rows.map((row, index) => {
            const label = String(row[widget.xKey] ?? '');
            const value = toNumber(row[widget.yKey]);
            const pct = Math.max(4, (value / max) * 100);
            return (
              <div key={`${label}-${index}`} className="nb-dashboard-bar-chart__item">
                <div className="nb-dashboard-bar-chart__bar-wrap">
                  <div
                    className="nb-dashboard-bar-chart__bar"
                    style={{ height: `${pct}%` }}
                    title={`${label}: ${formatDashboardValue(value, widget.valueFormat)}`}
                  />
                </div>
                <span className="nb-dashboard-bar-chart__label">{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </StatCard>
  );
}