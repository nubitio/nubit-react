import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatCard } from '@nubitio/ui';
import { DEFAULT_CHART_COLORS } from '../chartPalette';
import { formatDashboardValue } from '../formatValue';
import { resolveArray } from '../resolvePath';
import type { AreaChartWidgetConfig } from '../types';
import { ChartTooltip } from './ChartTooltip';

type Props = {
  widget: AreaChartWidgetConfig;
  data: Record<string, unknown>;
  loading?: boolean;
};

export function AreaChartWidgetView({ widget, data, loading }: Props) {
  const rows = resolveArray(data, widget.dataPath);
  const height = widget.height ?? 240;

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
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                {widget.series.map((series, index) => {
                  const color = series.color ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
                  return (
                    <linearGradient key={series.key} id={`nb-area-${widget.id}-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  );
                })}
              </defs>
              {widget.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              )}
              <XAxis
                dataKey={widget.xKey}
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                axisLine={{ stroke: 'var(--border-color)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) => formatDashboardValue(v, widget.valueFormat)}
              />
              <Tooltip
                content={<ChartTooltip labelFormat={widget.valueFormat} series={widget.series} />}
              />
              {widget.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {widget.series.map((series, index) => {
                const color = series.color ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
                return (
                  <Area
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label ?? series.key}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#nb-area-${widget.id}-${series.key})`}
                    stackId={widget.stacked ? 'stack' : undefined}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </StatCard>
  );
}
