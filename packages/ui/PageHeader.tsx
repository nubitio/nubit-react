import type { ReactNode } from 'react';
import { Badge, type BadgeVariant } from './Badge';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export interface PageHeaderBreadcrumb {
  label: string;
  href: string;
}

export interface PageHeaderBadge {
  label: string;
  variant?: BadgeVariant;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Status badges or other record metadata between title and subtitle. */
  metadata?: ReactNode;
  breadcrumb?: PageHeaderBreadcrumb;
  /** Custom breadcrumb node (e.g. react-router Link). Takes precedence over breadcrumb. */
  breadcrumbSlot?: ReactNode;
  /** Render a history-aware return action before the title. */
  onBack?: () => void;
  backLabel?: string;
  badge?: PageHeaderBadge;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  metadata,
  breadcrumb,
  breadcrumbSlot,
  onBack,
  backLabel = 'Volver',
  badge,
  actions,
  className,
}: PageHeaderProps) {
  const breadcrumbNode =
    breadcrumbSlot ??
    (onBack ? (
      <button type="button" className="nb-page-header__breadcrumb" onClick={onBack}>
        <i className="ph ph-arrow-left" aria-hidden />
        {backLabel}
      </button>
    ) : null) ??
    (breadcrumb ? (
      <a href={breadcrumb.href} className="nb-page-header__breadcrumb">
        <i className="ph ph-arrow-left" aria-hidden />
        {breadcrumb.label}
      </a>
    ) : null);

  return (
    <header className={joinClasses('nb-page-header', className)}>
      <div className="nb-page-header__main">
        {breadcrumbNode}
        <h1 className="nb-page-header__title">{title}</h1>
        {metadata && <div className="nb-page-header__metadata">{metadata}</div>}
        {subtitle && <p className="nb-page-header__subtitle">{subtitle}</p>}
      </div>
      {(badge || actions) && (
        <div className="nb-page-header__aside">
          {badge && (
            <Badge variant={badge.variant ?? 'info'} pill>
              {badge.label}
            </Badge>
          )}
          {actions}
        </div>
      )}
    </header>
  );
}
