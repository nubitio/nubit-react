import { StatCard } from '@nubitio/ui';
import { formatDashboardValue } from '../formatValue';
import { resolveArray, resolvePath } from '../resolvePath';
import type { DonutChartWidgetConfig } from '../types';

const DEFAULT_COLORS = [
  'var(--accent-color)',
  'var(--success-color)',
  'var(--warning-color)',
  'var(--info-color)',
  '#6b4fc8',
  '#c2410c',
];

type Props = {
  widget: DonutChartWidgetConfig;
  data: Record<string, unknown>;
  loading?: boolean;
};

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function DonutChartWidgetView({ widget, data, loading }: Props) {
  const rows = resolveArray(data, widget.dataPath);
  const colors = widget.colors ?? DEFAULT_COLORS;
  const total = rows.reduce((sum, row) => sum + toNumber(row[widget.valueKey]), 0);

  const centerValue =
    widget.centerValuePath !== undefined
      ? resolvePath(data, widget.centerValuePath)
      : total;

  let cumulative = 0;
  const radius = 38;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <StatCard
      title={widget.title}
      headerExtra={widget.subtitle ? <span className="nb-dashboard-widget__subtitle">{widget.subtitle}</span> : undefined}
      menuVisible={widget.menuVisible}
      isLoading={loading}
      className="nb-dashboard-chart-card"
    >
      {rows.length === 0 || total <= 0 ? (
        <div className="nb-dashboard-chart-empty">No data</div>
      ) : (
        <div className="nb-dashboard-donut">
          <div className="nb-dashboard-donut__chart" role="img" aria-label={widget.title}>
            <svg viewBox="0 0 100 100" className="nb-dashboard-donut__svg">
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="var(--surface-3)"
                strokeWidth={stroke}
              />
              {rows.map((row, index) => {
                const value = toNumber(row[widget.valueKey]);
                const pct = value / total;
                const dash = pct * circumference;
                const offset = cumulative * circumference;
                cumulative += pct;
                return (
                  <circle
                    key={`${String(row[widget.labelKey])}-${index}`}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={colors[index % colors.length]}
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 50 50)"
                    strokeLinecap="butt"
                  />
                );
              })}
            </svg>
            <div className="nb-dashboard-donut__center">
              {widget.centerLabel && (
                <span className="nb-dashboard-donut__center-label">{widget.centerLabel}</span>
              )}
              <span className="nb-dashboard-donut__center-value">
                {formatDashboardValue(centerValue, widget.valueFormat)}
              </span>
            </div>
          </div>

          {widget.showLegend !== false && (
            <ul className="nb-dashboard-donut__legend">
              {rows.map((row, index) => {
                const label = String(row[widget.labelKey] ?? '');
                const value = toNumber(row[widget.valueKey]);
                const pct = total > 0 ? (value / total) * 100 : 0;
                return (
                  <li key={`${label}-${index}`} className="nb-dashboard-donut__legend-item">
                    <span
                      className="nb-dashboard-donut__legend-swatch"
                      style={{ background: colors[index % colors.length] }}
                    />
                    <span className="nb-dashboard-donut__legend-label">{label}</span>
                    <span className="nb-dashboard-donut__legend-value">
                      {pct.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </StatCard>
  );
}