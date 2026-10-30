import type { ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import './Layout.scss';

export interface DetailLayoutProps {
  children: ReactNode;
  aside: ReactNode;
  asideLabel?: string;
  className?: string;
}

/** Responsive main/aside composition for record detail pages. */
export function DetailLayout({ children, aside, asideLabel, className }: DetailLayoutProps) {
  return (
    <div className={joinClasses('nb-detail-layout', className)}>
      <div className="nb-detail-layout__main">{children}</div>
      <aside className="nb-detail-layout__aside" aria-label={asideLabel}>
        {aside}
      </aside>
    </div>
  );
}
