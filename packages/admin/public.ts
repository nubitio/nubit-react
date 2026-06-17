// @nubitio/admin — Admin panel shell: layout, header, sidebar, footer slots.
// Import from this facade only; do not reach into implementation paths.

export { AdminShell } from './AdminShell';
export type { AdminShellProps, AdminMenuItem, AdminHeaderAction } from './AdminShell';

export { AdminHeader } from './AdminHeader';
export type { AdminHeaderProps } from './AdminHeader';

export { AdminSidebarMenu } from './AdminSidebarMenu';
export type { AdminSidebarMenuProps, AdminMenuSubItem, AdminSidebarMenuSelectEvent } from './AdminSidebarMenu';

export { useScreenSize, useScreenSizeClass } from './useScreenSize';

export { SessionProvider, useSession } from './auth/SessionContext';
export type { SessionProfile, SessionState, SessionProviderConfig, SessionContextValue } from './auth/SessionContext';

export { LoginPage } from './auth/LoginPage';
export type { LoginPageProps } from './auth/LoginPage';

export { useAppRuntime } from './runtime/useAppRuntime';
export type { NotificationType, ToastItem } from './runtime/useAppRuntime';

export { ToastHost } from './runtime/ToastHost';
export type { ToastHostProps } from './runtime/ToastHost';
