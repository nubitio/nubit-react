import type { ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, children, className }: SectionProps) {
  return (
    <section className={joinClasses('nb-section', className)}>
      <h2 className="nb-section__title">{title}</h2>
      {children}
    </section>
  );
}