import type { ReactNode } from 'react';
import './EmptyState.scss';

export type EmptyStateVariant = 'default' | 'danger' | 'warning' | 'success';
export type EmptyStateSize = 'sm' | 'md' | 'lg';

export interface EmptyStateProps {
  /** Phosphor icon name without the "ph-" prefix, e.g. "warning" or "folder-open". */
  icon?: string;
  /** Semantic variant — controls the icon and accent color. */
  variant?: EmptyStateVariant;
  /** Title text — required. */
  title: string;
  /** Optional supporting description. */
  description?: string;
  /** Optional action slot (buttons, links, etc.). */
  action?: ReactNode;
  /** Visual size. */
  size?: EmptyStateSize;
  /** Fill parent height — useful when used as a page-level fallback. */
  fill?: boolean;
  className?: string;
}

const DEFAULT_ICONS: Record<EmptyStateVariant, string> = {
  default:  'folder-open',
  danger:   'warning-circle',
  warning:  'warning',
  success:  'check-circle',
};

export const EmptyState = ({
  icon,
  variant = 'default',
  title,
  description,
  action,
  size = 'md',
  fill = false,
  className,
}: EmptyStateProps) => {
  const iconName = icon ?? DEFAULT_ICONS[variant];

  const classes = [
    'nb-empty-state',
    `nb-empty-state--${variant}`,
    `nb-empty-state--${size}`,
    fill && 'nb-empty-state--fill',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status" aria-live="polite">
      <div className="nb-empty-state__icon-wrap">
        <i className={`ph ph-${iconName}`} aria-hidden="true" />
      </div>
      <p className="nb-empty-state__title">{title}</p>
      {description && (
        <p className="nb-empty-state__description">{description}</p>
      )}
      {action && (
        <div className="nb-empty-state__action">{action}</div>
      )}
    </div>
  );
};
