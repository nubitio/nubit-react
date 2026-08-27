// Namespace import, no nombrado: recharts es un peer opcional y los
// bundlers que stubean un peer ausente fallan al no encontrar los
// *named exports* en el stub. Leerlos del namespace lo posterga al
// runtime, donde este chunk solo se pide si el widget se renderiza.
import * as recharts from 'recharts';

const CartesianGrid = recharts.CartesianGrid;
const Legend = recharts.Legend;
const Line = recharts.Line;
const LineChart = recharts.LineChart;
const ResponsiveContainer = recharts.ResponsiveContainer;
const Tooltip = recharts.Tooltip;
const XAxis = recharts.XAxis;
const YAxis = recharts.YAxis;
import { StatCard } from '@nubitio/ui';
import { DEFAULT_CHART_COLORS } from '../chartPalette';
import { formatDashboardValue } from '../formatValue';
import { resolveArray } from '../resolvePath';
import type { LineChartWidgetConfig } from '../types';
import { ChartTooltip } from './ChartTooltip';

type Props = {
  widget: LineChartWidgetConfig;
  data: Record<string, unknown>;
  loading?: boolean;
};

export function LineChartWidgetView({ widget, data, loading }: Props) {
  const rows = resolveArray(data, widget.dataPath);
  const height = widget.height ?? 240;

  return (
    <StatCard
      title={widget.title}
      headerExtra={
        widget.subtitle ? (
          <span className="nb-dashboard-widget__subtitle">{widget.subtitle}</span>
        ) : undefined
      }
      menuVisible={widget.menuVisible}
      isLoading={loading}
      className="nb-dashboard-chart-card"
    >
      {rows.length === 0 ? (
        <div className="nb-dashboard-chart-empty">No data</div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              {widget.showGrid !== false && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                  vertical={false}
                />
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
              {widget.series.map((series, index) => (
                <Line
                  key={series.key}
                  type={widget.curved === false ? 'linear' : 'monotone'}
                  dataKey={series.key}
                  name={series.label ?? series.key}
                  stroke={series.color ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </StatCard>
  );
}
