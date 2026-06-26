import type { ReactNode } from 'react';
import './KpiMetricRow.scss';

export type KpiMetricTone = 'default' | 'success' | 'warning' | 'danger';
export type KpiMetricLayout = 'cards' | 'strip';
export type KpiMetricDensity = 'default' | 'compact';

export interface KpiMetricItem {
  label: string;
  value: ReactNode;
  tone?: KpiMetricTone;
  hint?: ReactNode;
  icon?: string;
}

export interface KpiMetricRowProps {
  items: KpiMetricItem[];
  className?: string;
  layout?: KpiMetricLayout;
  density?: KpiMetricDensity;
  testId?: string;
  loading?: boolean;
}

function normalizeIcon(icon?: string): string | undefined {
  if (!icon) return undefined;
  if (icon.startsWith('ph ')) return icon;
  if (icon.startsWith('ph-')) return `ph ${icon}`;
  return `ph ph-${icon}`;
}

export function KpiMetricRow({
  items,
  className = '',
  layout = 'cards',
  density = 'default',
  testId,
  loading = false,
}: KpiMetricRowProps) {
  if (items.length === 0) {
    return null;
  }

  const layoutClass = layout === 'strip' ? ' nb-kpi-metric-row--strip' : '';
  const densityClass = density === 'compact' ? ' nb-kpi-metric-row--compact' : '';

  return (
    <div
      className={`nb-kpi-metric-row${layoutClass}${densityClass}${className ? ` ${className}` : ''}`}
      data-testid={testId}
      role="group"
      aria-busy={loading}
    >
      {items.map((item) => {
        const iconClass = normalizeIcon(item.icon);
        return (
          <div
            key={item.label}
            className={`nb-kpi-metric-card nb-kpi-metric-card--${item.tone ?? 'default'}`}
          >
            {layout === 'strip' && iconClass && (
              <span className="nb-kpi-metric-card__icon" aria-hidden="true">
                <i className={iconClass} />
              </span>
            )}
            <div className="nb-kpi-metric-card__body">
              <span className="nb-kpi-metric-card__label">{item.label}</span>
              <span className="nb-kpi-metric-card__value">{item.value}</span>
              {item.hint && <span className="nb-kpi-metric-card__hint">{item.hint}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}