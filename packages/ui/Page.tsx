import type { HTMLAttributes, ReactNode } from 'react';
import { gapClass, joinClasses, type SpaceScale } from './layoutUtils';
import './Layout.scss';

export interface PageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Stretch to fill the admin shell content area (flex column). */
  fill?: boolean;
  /** Remove max-width cap for wide data views. */
  wide?: boolean;
  /** Cap width for narrow forms. */
  narrow?: boolean;
  gap?: SpaceScale;
}

export function Page({
  children,
  fill,
  wide,
  narrow,
  gap = 5,
  className,
  ...props
}: PageProps) {
  return (
    <div
      className={joinClasses(
        'nb-page',
        fill && 'nb-page--fill',
        wide && 'nb-page--wide',
        narrow && 'nb-page--narrow',
        gapClass('nb-page', gap),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}