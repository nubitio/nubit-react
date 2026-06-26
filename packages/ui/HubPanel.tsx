import type { ReactNode } from 'react';
import './HubPanel.scss';

export type HubPanelVariant = 'card' | 'flush';

export interface HubPanelProps {
  children: ReactNode;
  /** Flush drops outer chrome — ideal inside SmartCrudPage aboveGrid. */
  variant?: HubPanelVariant;
  className?: string;
  testId?: string;
}

/**
 * Card shell for feature-hub chrome above a CRUD grid (KPIs, scope tabs, filters).
 */
export function HubPanel({
  children,
  variant = 'card',
  className = '',
  testId,
}: HubPanelProps) {
  const variantClass = variant === 'flush' ? ' nb-hub-panel--flush' : '';

  return (
    <div
      className={`nb-hub-panel${variantClass}${className ? ` ${className}` : ''}`}
      data-testid={testId}
    >
      {children}
    </div>
  );
}