import type { ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { AdminMenuItem, AdminShellProps } from '../AdminShell';
import type { AdminMenuSubItem } from '../AdminSidebarMenu';
import type { AppProfile, SessionState } from '../auth/SessionContext';

export type NubitAppRoute = {
  path: string;
  element: ReactNode;
};

export type NubitAppMenuSubItem = AdminMenuSubItem & {
  /** UX-only — hide unless the session has one of these roles. */
  roles?: string | string[];
};

export type NubitAppMenuItem = AdminMenuItem & {
  /** UX-only — hide unless the session has one of these roles. */
  roles?: string | string[];
  items?: NubitAppMenuSubItem[];
};

export type NubitAppMenuContext = {
  roles: string[];
  username: string | null;
  session: SessionState;
  appProfile?: AppProfile;
  logout: () => Promise<void>;
};

export type NubitAppUserMenuContext = NubitAppMenuContext & {
  close: () => void;
};

export type CreateNubitAppConfig = {
  title: string;
  apiBaseUrl?: string;
  homePath?: string;
  locale?: string;
  timezone?: string;
  currency?: string;
  menu: NubitAppMenuItem[] | ((ctx: NubitAppMenuContext) => NubitAppMenuItem[]);
  routes: NubitAppRoute[];
  /**
   * Final menu filter — runs after optional {@link filterMenuByRoles} when items
   * declare `roles`. Use for app-specific rules (tenant features, runtime config).
   */
  filterMenu?: (items: AdminMenuItem[], ctx: NubitAppMenuContext) => AdminMenuItem[];
  login?: {
    title?: string;
    hint?: string;
    defaultUsername?: string;
  };
  shell?: Pick<AdminShellProps, 'headerActions' | 'footer'>;
  renderThemeSwitcher?: () => ReactNode;
  renderUserMenu?: (ctx: NubitAppUserMenuContext) => ReactNode;
  /** Wraps authenticated shell content (inside Hydra providers). */
  Wrapper?: React.ComponentType<{ children: ReactNode }>;
  queryClient?: QueryClient;
  /** Register Mercure + Hydra schema/store providers. Default true. */
  hydra?: boolean;
};

export type NubitApp = {
  App: React.ComponentType;
};