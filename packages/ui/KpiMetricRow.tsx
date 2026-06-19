import type { ReactNode } from 'react';
import './KpiMetricRow.scss';

export type KpiMetricTone = 'default' | 'success' | 'warning' | 'danger';

export interface KpiMetricItem {
  label: string;
  value: ReactNode;
  tone?: KpiMetricTone;
}

export interface KpiMetricRowProps {
  items: KpiMetricItem[];
  className?: string;
}

export function KpiMetricRow({ items, className = '' }: KpiMetricRowProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`nb-kpi-metric-row${className ? ` ${className}` : ''}`} role="group">
      {items.map((item) => (
        <div
          key={item.label}
          className={`nb-kpi-metric-card nb-kpi-metric-card--${item.tone ?? 'default'}`}
        >
          <span className="nb-kpi-metric-card__label">{item.label}</span>
          <span className="nb-kpi-metric-card__value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}