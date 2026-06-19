import { StatCard } from '@nubitio/ui';
import { formatDashboardValue } from '../formatValue';
import { resolvePath } from '../resolvePath';
import type { StatWidgetConfig } from '../types';

type Props = {
  widget: StatWidgetConfig;
  data: Record<string, unknown>;
  loading?: boolean;
};

function resolveTrend(
  widget: StatWidgetConfig,
  data: Record<string, unknown>,
): { value: number | null; label?: string; invert?: boolean } {
  if (!widget.trend) return { value: null };
  const raw =
    widget.trend.valuePath !== undefined
      ? resolvePath(data, widget.trend.valuePath)
      : widget.trend.value;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  return {
    value: Number.isFinite(numeric) ? numeric : null,
    label: widget.trend.label,
    invert: widget.trend.invertColors,
  };
}

export function StatWidgetView({ widget, data, loading }: Props) {
  const rawValue =
    widget.valuePath !== undefined ? resolvePath(data, widget.valuePath) : widget.value;
  const valueText = formatDashboardValue(rawValue, widget.format ?? 'text');
  const trend = resolveTrend(widget, data);

  const trendDirection =
    trend.value === null || trend.value === 0
      ? 'flat'
      : trend.value > 0
        ? 'up'
        : 'down';

  const trendClass =
    trendDirection === 'flat'
      ? 'nb-stat-card__delta--flat'
      : trendDirection === 'up'
        ? trend.invert
          ? 'nb-stat-card__delta--down'
          : 'nb-stat-card__delta--up'
        : trend.invert
          ? 'nb-stat-card__delta--up'
          : 'nb-stat-card__delta--down';

  const trendArrow = trendDirection === 'up' ? '▲' : trendDirection === 'down' ? '▼' : '—';
  const trendText =
    trend.value === null
      ? null
      : `${trendArrow} ${formatDashboardValue(Math.abs(trend.value), 'percent')}${trend.label ? ` ${trend.label}` : ''}`;

  return (
    <StatCard
      title={widget.title}
      menuVisible={widget.menuVisible}
      isLoading={loading}
      className={`nb-dashboard-stat nb-dashboard-stat--${widget.iconTone ?? 'accent'}`}
    >
      <div className="nb-dashboard-stat__content">
        {widget.icon && (
          <span className={`nb-dashboard-stat__icon nb-dashboard-stat__icon--${widget.iconTone ?? 'accent'}`}>
            <i className={`ph ${widget.icon}`} aria-hidden="true" />
          </span>
        )}
        <div className="nb-dashboard-stat__metrics">
          <span className="nb-stat-card__value nb-stat-card__value--2xl">{valueText}</span>
          {trendText && <span className={`nb-stat-card__delta ${trendClass}`}>{trendText}</span>}
        </div>
      </div>
    </StatCard>
  );
}