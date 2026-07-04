import type { HTMLAttributes, ReactNode } from 'react';
import {
  gapClass,
  joinClasses,
  type FlexAlign,
  type FlexJustify,
  type SpaceScale,
} from './layoutUtils';
import './Layout.scss';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  gap?: SpaceScale;
  align?: FlexAlign;
  justify?: FlexJustify;
  fill?: boolean;
}

export function Stack({
  children,
  gap = 4,
  align,
  justify,
  fill,
  className,
  ...props
}: StackProps) {
  return (
    <div
      className={joinClasses(
        'nb-stack',
        gapClass('nb-stack', gap),
        align && `nb-stack--align-${align}`,
        justify && `nb-stack--justify-${justify}`,
        fill && 'nb-stack--fill',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}