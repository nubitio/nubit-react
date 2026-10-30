import type { ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  /** Panel titles use sentence case; label preserves the compact group heading. */
  variant?: 'label' | 'panel';
}

export function Section({ title, children, className, variant = 'label' }: SectionProps) {
  return (
    <section
      className={joinClasses('nb-section', variant === 'panel' && 'nb-section--panel', className)}
    >
      <h2 className="nb-section__title">{title}</h2>
      {children}
    </section>
  );
}
