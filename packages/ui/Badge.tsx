import type { ReactNode } from 'react';
import './Badge.scss';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /** Color variant — maps to semantic CSS tokens. */
  variant?: BadgeVariant;
  /** Size: md (default) or sm. */
  size?: BadgeSize;
  /** Outlined style — transparent background with colored border and text. */
  outlined?: boolean;
  /** Render as a pill (fully rounded). */
  pill?: boolean;
  /** Dot-only mode — renders a small colored circle with no text. */
  dot?: boolean;
  children?: ReactNode;
  className?: string;
}

export const Badge = ({
  variant = 'primary',
  size = 'md',
  outlined = false,
  pill = true,
  dot = false,
  children,
  className,
}: BadgeProps) => {
  const classes = [
    'nb-badge',
    `nb-badge--${variant}`,
    size === 'sm' && 'nb-badge--sm',
    outlined && 'nb-badge--outlined',
    pill && 'nb-badge--pill',
    dot && 'nb-badge--dot',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes}>{dot ? null : children}</span>;
};
