import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AdminHeader, type AdminHeaderAction } from './AdminHeader';
import { AdminSidebarMenu, type AdminMenuItem, type AdminSidebarMenuSelectEvent } from './AdminSidebarMenu';
import { useScreenSize } from './useScreenSize';
import './admin.scss';

enum MenuOpenState {
  Closed = 1,
  Opened = 2,
  TemporaryOpened = 3,
}

type MenuStatus = MenuOpenState | null;

export type { AdminMenuItem, AdminHeaderAction };

export interface AdminShellProps {
  title?: string;
  menuItems: AdminMenuItem[];
  headerActions?: AdminHeaderAction[];
  renderUserMenu?: (props: { close: () => void }) => React.ReactNode;
  renderThemeSwitcher?: () => React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminShell = ({
  title,
  menuItems,
  headerActions,
  renderUserMenu,
  renderThemeSwitcher,
  footer,
  children,
}: AdminShellProps) => {
  const navigate = useNavigate();
  const { isXSmall, isLarge } = useScreenSize();
  const [menuStatus, setMenuStatus] = useState<MenuStatus>(null);

  const getDefaultMenuOpenState = useCallback(
    () => (isLarge ? MenuOpenState.Opened : MenuOpenState.Closed),
    [isLarge],
  );

  const getMenuOpenState = useCallback(
    (status: MenuStatus) => (status === null ? getDefaultMenuOpenState() : status),
    [getDefaultMenuOpenState],
  );

  const getMenuStatus = useCallback(
    (status: MenuStatus) =>
      status === getDefaultMenuOpenState() ? null : status,
    [getDefaultMenuOpenState],
  );

  const changeMenuStatus = useCallback(
    (reducerFn: (prevStatus: MenuStatus) => MenuStatus) => {
      setMenuStatus((prev) =>
        getMenuStatus(reducerFn(getMenuOpenState(prev)) ?? prev),
      );
    },
    [getMenuOpenState, getMenuStatus],
  );

  const toggleMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      changeMenuStatus((prev) =>
        prev === MenuOpenState.Closed ? MenuOpenState.Opened : MenuOpenState.Closed,
      );
      event.stopPropagation();
    },
    [changeMenuStatus],
  );

  const temporaryOpenMenu = useCallback(() => {
    changeMenuStatus((prev) =>
      prev === MenuOpenState.Closed ? MenuOpenState.TemporaryOpened : null,
    );
  }, [changeMenuStatus]);

  const closeMenuFromOverlay = useCallback(() => {
    changeMenuStatus((prev) =>
      prev !== MenuOpenState.Closed && !isLarge ? MenuOpenState.Closed : null,
    );
  }, [isLarge, changeMenuStatus]);

  const onNavigationChanged = useCallback(
    ({ path, event, selected }: AdminSidebarMenuSelectEvent) => {
      if (getMenuOpenState(menuStatus) === MenuOpenState.Closed || !path || selected) {
        event?.preventDefault();
        return;
      }
      navigate(path);
      if (!isLarge || menuStatus === MenuOpenState.TemporaryOpened) {
        setMenuStatus(getMenuStatus(MenuOpenState.Closed));
        event?.stopPropagation();
      }
    },
    [navigate, menuStatus, isLarge, getMenuOpenState, getMenuStatus],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing menu status to screen size change is intentional derived state
    changeMenuStatus(() => menuStatus);
  }, [isLarge, changeMenuStatus, menuStatus]);

  const menuOpenState = getMenuOpenState(menuStatus);
  const isMenuOpen = menuOpenState !== MenuOpenState.Closed;
  const isCompact = menuOpenState === MenuOpenState.Closed;

  const bodyClassName = [
    'nb-admin-shell__body nb-admin-layout-body',
    isMenuOpen ? 'is-open' : 'is-closed',
    isCompact ? 'is-compact' : '',
    isLarge ? 'is-large' : 'is-overlay',
    isXSmall ? 'is-xsmall' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="nb-admin-shell">
      <AdminHeader
        className="nb-admin-layout-header"
        menuToggleEnabled
        toggleMenu={toggleMenu}
        title={title}
        actions={headerActions}
        renderUserMenu={renderUserMenu}
        renderThemeSwitcher={renderThemeSwitcher}
      />
      <div className={bodyClassName}>
        <aside className="nb-admin-shell__panel" aria-label="Main menu">
          <AdminSidebarMenu
            items={menuItems}
            compactMode={isCompact}
            selectedItemChanged={onNavigationChanged}
            openMenu={temporaryOpenMenu}
            footer={footer}
          />
        </aside>
        {!isLarge && isMenuOpen && (
          <button
            className="nb-admin-shell__scrim"
            type="button"
            aria-label="Close menu"
            onClick={closeMenuFromOverlay}
          />
        )}
        <main className="nb-admin-shell__content content">
          {children}
        </main>
      </div>
    </div>
  );
};
