import type { HTMLAttributes } from 'react';
import './LoadingIndicators.scss';

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Localized accessible name. Omit for a decorative indicator. */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ label, size = 'md', className, ...props }: SpinnerProps) {
  return (
    <span
      {...props}
      className={`nb-spinner nb-spinner--${size}${className ? ` ${className}` : ''}`}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
