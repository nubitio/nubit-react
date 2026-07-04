import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { gapClass, joinClasses, type SpaceScale } from './layoutUtils';
import './Layout.scss';

export type GridCols = 12 | 'auto' | 1 | 2 | 3 | 4;

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** 12-column grid or auto-fit equal columns. */
  cols?: GridCols;
  gap?: SpaceScale;
  /** Minimum column width when cols="auto". */
  minColWidth?: string;
  fill?: boolean;
}

export function Grid({
  children,
  cols = 12,
  gap = 4,
  minColWidth,
  fill,
  className,
  style,
  ...props
}: GridProps) {
  const gridStyle: CSSProperties = {
    ...style,
    ...(minColWidth ? { '--nb-grid-min-col': minColWidth } : {}),
  } as CSSProperties;

  const colsClass =
    cols === 12
      ? 'nb-grid--cols-12'
      : cols === 'auto'
        ? 'nb-grid--cols-auto'
        : `nb-grid--cols-${cols}`;

  return (
    <div
      className={joinClasses(
        'nb-grid',
        colsClass,
        gapClass('nb-grid', gap),
        fill && 'nb-grid--fill',
        className,
      )}
      style={gridStyle}
      {...props}
    >
      {children}
    </div>
  );
}