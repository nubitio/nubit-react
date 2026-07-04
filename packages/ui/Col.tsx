import type { HTMLAttributes, ReactNode } from 'react';
import { colSpanClasses, joinClasses, type ColSpan } from './layoutUtils';
import './Layout.scss';

export interface ColProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Span at all breakpoints (overrides the mobile full-width default). */
  span?: ColSpan;
  spanSm?: ColSpan;
  spanMd?: ColSpan;
  spanLg?: ColSpan;
  /** Span all columns in the current row. */
  fullWidth?: boolean;
}

export function Col({
  children,
  span,
  spanSm,
  spanMd,
  spanLg,
  fullWidth,
  className,
  ...props
}: ColProps) {
  return (
    <div
      className={joinClasses(
        ...colSpanClasses(span, spanSm, spanMd, spanLg),
        fullWidth && 'nb-span-full',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}