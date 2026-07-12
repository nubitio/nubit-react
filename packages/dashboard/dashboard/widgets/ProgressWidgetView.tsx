import { StatCard } from '@nubitio/ui';
import { formatDashboardValue } from '../formatValue';
import { resolvePath } from '../resolvePath';
import type { ProgressWidgetConfig } from '../types';

type Props = {
  widget: ProgressWidgetConfig;
  data: Record<string, unknown>;
  loading?: boolean;
};

function toNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function ProgressWidgetView({ widget, data, loading }: Props) {
  const rawValue = widget.valuePath !== undefined ? resolvePath(data, widget.valuePath) : widget.value;
  const value = toNumber(rawValue, 0);
  const max = widget.maxPath !== undefined ? toNumber(resolvePath(data, widget.maxPath), 100) : (widget.max ?? 100);
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tone = widget.tone ?? 'accent';

  return (
    <StatCard
      title={widget.title}
      headerExtra={widget.subtitle ? <span className="nb-dashboard-widget__subtitle">{widget.subtitle}</span> : undefined}
      menuVisible={widget.menuVisible}
      isLoading={loading}
      className={`nb-dashboard-progress nb-dashboard-progress--${tone}`}
    >
      <div className="nb-dashboard-progress__meter" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="nb-dashboard-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="nb-dashboard-progress__labels">
        <span className="nb-dashboard-progress__value">{formatDashboardValue(value, widget.format ?? 'number')}</span>
        <span className="nb-dashboard-progress__max">
          / {formatDashboardValue(max, widget.format ?? 'number')}
        </span>
      </div>
    </StatCard>
  );
}
