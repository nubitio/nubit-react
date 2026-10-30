import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUiStrings } from '@nubitio/ui';
import './admin.scss';

export interface AdminBottomNavigationItem {
  text: string;
  path: string;
  icon?: string;
  badge?: ReactNode;
}

export interface AdminBottomNavigationProps {
  /** Pass only destinations this user may access; authorization stays in the app/API. */
  items: AdminBottomNavigationItem[];
  label?: string;
}

export function AdminBottomNavigation({ items, label }: AdminBottomNavigationProps) {
  const { pathname } = useLocation();
  const strings = useUiStrings();
  const normalize = (path: string) => path.replace(/\/+$/, '') || '/';
  const currentPath = normalize(pathname);
  const activePath = items
    .map((item) => normalize(item.path))
    .filter((path) => currentPath === path || (path !== '/' && currentPath.startsWith(`${path}/`)))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="nb-admin-bottom-nav" aria-label={label ?? strings.mainNavigation}>
      {items.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className="nb-admin-bottom-nav__item"
          aria-current={normalize(item.path) === activePath ? 'page' : undefined}
        >
          {item.icon && (
            <span
              className={`nb-admin-bottom-nav__icon ${item.icon.includes(' ') ? item.icon : `ph ph-${item.icon}`}`}
              aria-hidden="true"
            />
          )}
          <span className="nb-admin-bottom-nav__label">{item.text}</span>
          {item.badge != null && <span className="nb-admin-bottom-nav__badge">{item.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
