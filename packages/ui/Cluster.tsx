import type { HTMLAttributes, ReactNode } from 'react';
import { gapClass, joinClasses, type SpaceScale } from './layoutUtils';
import './Layout.scss';

export interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  gap?: SpaceScale;
}

/** Inline flex row that wraps — ideal for button groups and filter actions. */
export function Cluster({ children, gap = 2, className, ...props }: ClusterProps) {
  return (
    <div
      className={joinClasses('nb-cluster', gapClass('nb-cluster', gap), className)}
      {...props}
    >
      {children}
    </div>
  );
}