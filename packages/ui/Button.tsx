import { forwardRef } from 'react';
import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  ElementType,
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';
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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    fullWidth = false,
    icon,
    loading = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
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
      {loading ? (
        <span className="nb-button-spinner" aria-hidden="true" />
      ) : icon ? (
        <i className={icon} aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  variant?: 'default' | 'danger';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'default', className, ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={props.type ?? 'button'}
      aria-label={props['aria-label'] ?? label}
      title={props.title ?? label}
      className={cx('nb-icon-button', variant === 'danger' && 'nb-icon-button--danger', className)}
    >
      <i className={icon} aria-hidden="true" />
    </button>
  );
});

interface ButtonLinkOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: string;
  /** Renders a non-interactive, `aria-disabled` link. */
  disabled?: boolean;
  children?: ReactNode;
}

export type ButtonLinkProps<C extends ElementType = 'a'> = ButtonLinkOwnProps & {
  /**
   * Element or component to render, e.g. a router `Link`. Defaults to `a`. Its own
   * props (`to`, …) are accepted alongside.
   */
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof ButtonLinkOwnProps | 'as'>;

type ButtonLinkComponent = <C extends ElementType = 'a'>(
  props: ButtonLinkProps<C> & { ref?: Ref<Element> },
) => ReactElement | null;

/** A link that looks like a `Button`: use it for navigation, `Button` for actions. */
export const ButtonLink = forwardRef(function ButtonLink(
  {
    variant = 'secondary',
    size = 'md',
    fullWidth = false,
    icon,
    disabled = false,
    as,
    className,
    children,
    onClick,
    ...props
  }: ButtonLinkProps<ElementType> & {
    className?: string;
    onClick?: (e: MouseEvent<HTMLElement>) => void;
  },
  ref: Ref<Element>,
) {
  const Component: ElementType = as ?? 'a';
  return (
    <Component
      {...props}
      ref={ref}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : props.tabIndex}
      onClick={(event: MouseEvent<HTMLElement>) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cx(
        'nb-button',
        'nb-button--link',
        `nb-button--${variant}`,
        size === 'sm' && 'nb-button--sm',
        fullWidth && 'nb-button--full',
        disabled && 'nb-button--disabled',
        className,
      )}
    >
      {icon ? <i className={icon} aria-hidden="true" /> : null}
      {children}
    </Component>
  );
}) as ButtonLinkComponent;
