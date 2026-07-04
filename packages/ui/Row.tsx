import type { HTMLAttributes, ReactNode } from 'react';
import {
  gapClass,
  joinClasses,
  type FlexAlign,
  type FlexJustify,
  type SpaceScale,
} from './layoutUtils';
import './Layout.scss';

export interface RowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  gap?: SpaceScale;
  align?: FlexAlign;
  justify?: FlexJustify;
  wrap?: boolean;
  fill?: boolean;
}

export function Row({
  children,
  gap = 2,
  align,
  justify,
  wrap,
  fill,
  className,
  ...props
}: RowProps) {
  return (
    <div
      className={joinClasses(
        'nb-row',
        gapClass('nb-row', gap),
        align && `nb-row--align-${align}`,
        justify && `nb-row--justify-${justify}`,
        wrap && 'nb-row--wrap',
        fill && 'nb-row--fill',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}