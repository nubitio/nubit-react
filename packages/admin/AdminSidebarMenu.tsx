import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScreenSize } from './useScreenSize';

export interface AdminMenuSubItem {
  text: string;
  path: string;
}

export interface AdminMenuItem {
  text: string;
  path?: string;
  icon?: string;
  items?: AdminMenuSubItem[];
}

export interface AdminSidebarMenuSelectEvent {
  path?: string;
  selected: boolean;
  event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>;
}

export interface AdminSidebarMenuProps {
  items: AdminMenuItem[];
  compactMode?: boolean;
  selectedItemChanged: (e: AdminSidebarMenuSelectEvent) => void;
  openMenu?: (e: React.PointerEvent) => void;
  footer?: React.ReactNode;
}

const normalizeRoute = (path?: string) => {
  if (!path) return '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
};

const getIconClassName = (icon?: string) => {
  if (!icon) return '';
  return icon.includes(' ') ? icon : `ph ph-${icon}`;
};

export const AdminSidebarMenu = ({
  items,
  compactMode = false,
  selectedItemChanged,
  openMenu,
  footer,
}: AdminSidebarMenuProps) => {
  const [expandedItemKeys, setExpandedItemKeys] = useState<Set<string>>(new Set());
  const { isLarge } = useScreenSize();
  const location = useLocation();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- always start collapsed; the active-parent effect will expand the right section
    setExpandedItemKeys(new Set());
  }, [isLarge, items]);

  const activePath = useMemo(() => {
    const flattenPaths = (menuItems: AdminMenuItem[]) =>
      menuItems
        .flatMap((item) => [
          normalizeRoute(item.path),
          ...(item.items?.map((sub) => normalizeRoute(sub.path)) ?? []),
        ])
        .filter(Boolean);

    const requestedPath = normalizeRoute(location.pathname);
    const allPaths = flattenPaths(items);
    return (
      allPaths.find((path) => path === requestedPath) ??
      allPaths
        .filter((path) => requestedPath.startsWith(path) && path !== '/')
        .sort((a, b) => b.length - a.length)[0]
    );
  }, [location.pathname, items]);

  const isSelected = useCallback(
    (path?: string) => normalizeRoute(path) === activePath,
    [activePath],
  );

  const parentContainsSelected = useCallback(
    (item: AdminMenuItem) => item.items?.some((sub) => isSelected(sub.path)) ?? false,
    [isSelected],
  );

  useEffect(() => {
    const activeParent = items.find((item) => parentContainsSelected(item));
    if (!activeParent || compactMode) return;

    const activeParentKey = activeParent.path || activeParent.text;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route changes should reveal the active child menu item
    setExpandedItemKeys((prev) => {
      if (prev.has(activeParentKey)) return prev;
      const next = new Set(prev);
      next.add(activeParentKey);
      return next;
    });
  }, [compactMode, items, parentContainsSelected]);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (path: string | undefined, selected: boolean, event: React.MouseEvent<HTMLButtonElement>) => {
      selectedItemChanged({ path, selected, event });
    },
    [selectedItemChanged],
  );

  return (
    <div
      className={`nb-admin-menu${compactMode ? ' compact' : ''}`}
      onPointerDown={openMenu}
    >
      <div className="nb-admin-menu-container theme-dependent">
        <nav className="nb-admin-menu__nav" aria-label="Main navigation">
          {items.map((item) => {
            const selected = isSelected(item.path);
            const containsSelected = parentContainsSelected(item);
            const itemKey = item.path || item.text;
            const hasChildren = (item.items?.length ?? 0) > 0;
            const expanded = !compactMode && hasChildren && expandedItemKeys.has(itemKey);

            return (
              <section
                className={`nb-admin-menu__section${containsSelected ? ' has-selected-child' : ''}`}
                key={itemKey}
              >
                <button
                  className={`nb-admin-menu__item nb-admin-menu__item--parent${selected ? ' is-selected' : ''}`}
                  type="button"
                  aria-current={selected ? 'page' : undefined}
                  aria-expanded={hasChildren ? expanded : undefined}
                  onClick={(event) => {
                    if (hasChildren) {
                      toggleExpanded(itemKey);
                      return;
                    }
                    handleSelect(item.path, selected, event);
                  }}
                >
                  <span
                    className={`nb-admin-menu__icon ${getIconClassName(item.icon)}`}
                    aria-hidden="true"
                  />
                  <span className="nb-admin-menu__text">{item.text}</span>
                  {hasChildren && (
                    <span
                      className={`nb-admin-menu__chevron${expanded ? ' is-expanded' : ''}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
                {expanded && (item.items?.length ?? 0) > 0 && (
                  <div className="nb-admin-menu__children">
                    {item.items!.map((subItem) => {
                      const childSelected = isSelected(subItem.path);
                      return (
                        <button
                          className={`nb-admin-menu__item nb-admin-menu__item--child${childSelected ? ' is-selected' : ''}`}
                          type="button"
                          key={subItem.path || subItem.text}
                          aria-current={childSelected ? 'page' : undefined}
                          onClick={(event) => handleSelect(subItem.path, childSelected, event)}
                        >
                          <span className="nb-admin-menu__text">{subItem.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </nav>
      </div>
      {footer && <footer className="nb-admin-footer">{footer}</footer>}
    </div>
  );
};
