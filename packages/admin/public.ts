// @nubitio/admin — Admin panel shell: layout, header, sidebar, footer slots.
// Import from this facade only; do not reach into implementation paths.

export { AdminShell } from './AdminShell';
export type { AdminShellProps, AdminMenuItem, AdminHeaderAction } from './AdminShell';

export { AdminHeader } from './AdminHeader';
export type { AdminHeaderProps } from './AdminHeader';

export { AdminSidebarMenu } from './AdminSidebarMenu';
export type { AdminSidebarMenuProps, AdminMenuSubItem, AdminSidebarMenuSelectEvent } from './AdminSidebarMenu';

export { useScreenSize, useScreenSizeClass } from './useScreenSize';
