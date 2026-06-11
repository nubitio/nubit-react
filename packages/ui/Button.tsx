import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: string;
  loading?: boolean;
  children?: ReactNode;
}

const cx = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ');

export const Button = ({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    {...props}
    type={props.type ?? 'button'}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cx(
      'nb-button',
      `nb-button--${variant}`,
      size === 'sm' && 'nb-button--sm',
      fullWidth && 'nb-button--full',
      className,
    )}
  >
    {loading ? <span className="nb-button-spinner" aria-hidden="true" /> : icon ? <i className={icon} aria-hidden="true" /> : null}
    {children}
  </button>
);

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  variant?: 'default' | 'danger';
}

export const IconButton = ({ icon, label, variant = 'default', className, ...props }: IconButtonProps) => (
  <button
    {...props}
    type={props.type ?? 'button'}
    aria-label={props['aria-label'] ?? label}
    title={props.title ?? label}
    className={cx('nb-icon-button', variant === 'danger' && 'nb-icon-button--danger', className)}
  >
    <i className={icon} aria-hidden="true" />
  </button>
);
