import React, { ReactNode } from 'react';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import './StatCard.scss';

export interface StatCardProps {
  title?: string;
  /** Extra content rendered in the header row (e.g. a date-range badge) */
  headerExtra?: ReactNode;
  /** Whether to show the three-dot overflow menu */
  menuVisible?: boolean;
  /** Items for the overflow menu */
  menuItems?: ContextMenuItem[];
  /** When true children are not rendered (skeleton/loading state) */
  isLoading?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * General-purpose analytics / dashboard card.
 * Replaces the legacy `shared/ui/card-analytics/CardAnalytics` component.
 * Uses `ContextMenu` from `@nubit/ui` for the overflow menu.
 */
export const StatCard = ({
  title,
  headerExtra,
  menuVisible = true,
  menuItems = [{ label: 'Configure' }, { label: 'Remove' }],
  isLoading = false,
  className = '',
  children,
}: StatCardProps) => (
  <div className={`nb-stat-card${className ? ` ${className}` : ''}`}>
    <div className="nb-stat-card__header">
      <div>
        {title && <span className="nb-stat-card__title">{title}</span>}
        {headerExtra && <span className="nb-stat-card__extra">{headerExtra}</span>}
      </div>
      {menuVisible && (
        <span className="nb-stat-card__menu">
          <ContextMenu items={menuItems} />
        </span>
      )}
    </div>
    {!isLoading && <div className="nb-stat-card__body">{children}</div>}
  </div>
);
