import type { CSSProperties, FormHTMLAttributes, ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export type FormLayoutVariant = 'stack' | 'grid' | 'inline' | 'filter';

export interface FormLayoutProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  variant?: FormLayoutVariant;
  /** Minimum column width for grid and filter variants. */
  minColWidth?: string;
}

export function FormLayout({
  children,
  variant = 'stack',
  minColWidth,
  className,
  style,
  ...props
}: FormLayoutProps) {
  const formStyle: CSSProperties = {
    ...style,
    ...(minColWidth ? { '--nb-form-min-col': minColWidth } : {}),
  } as CSSProperties;

  return (
    <form
      className={joinClasses(
        'nb-form-layout',
        variant !== 'stack' && `nb-form-layout--${variant}`,
        className,
      )}
      style={formStyle}
      {...props}
    >
      {children}
    </form>
  );
}