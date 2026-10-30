# @nubitio/admin

Admin shell layout for Nubit apps: responsive sidebar with nested menus, header with action slots, and screen-size utilities.

## Install

```bash
npm install @nubitio/admin
```

## Peer dependencies

```json
"react": "^19",
"react-dom": "^19",
"react-router-dom": "^6"
```

## Usage

```tsx
import { AdminShell } from '@nubitio/admin';
import '@nubitio/admin/style.css';

const menu = [
  { text: 'Dashboard', icon: 'ph ph-house', path: '/' },
  {
    text: 'Catalog',
    icon: 'ph ph-package',
    items: [
      { text: 'Products', path: '/products' },
      { text: 'Categories', path: '/categories' },
    ],
  },
];

export function App() {
  return (
    <AdminShell title="My Admin" menuItems={menu}>
      {/* routed content */}
    </AdminShell>
  );
}
```

## Exports

### Nubit workspace layout (opt-in)

The existing layout remains the default. `variant="workspace"` places the sidebar
alongside the header on large screens and retains the overlay menu on smaller
screens. Application-specific search and company/branch selection stay outside
the library:

```tsx
<AdminShell
  variant="workspace"
  title="Sales"
  menuItems={menu}
  brand={<CompanyLogo />}
  headerContent={<WorkspaceSearch />}
  sidebarContext={<CompanyBranchPicker />}
  bottomNavigation={<AdminBottomNavigation items={mobileDestinations} />}
>
  {children}
</AdminShell>
```

`brand` and `sidebarContext` are hidden in compact mode. The bottom-navigation
slot renders only on extra-small screens, reserves its own space (including the
device safe area), and does not cover the main content. `AdminBottomNavigation`
uses router links and marks the longest matching destination with `aria-current`.
Pass only authorized destinations. Its `label` prop names the navigation landmark.

All slots and `variant` are also available through `createNubitApp({ shell: … })`.
Set `visualStyle: 'nubit'` to opt into the Figma token foundation when using the
app factory; see the UI package README for font setup.

Preview in the demo: `/dashboard?visualStyle=nubit`. Search navigates between demo
pages; the context label is illustrative, not an ERP company selector.

- `AdminShell` — full layout: sidebar + header + content area
- `AdminHeader` — standalone header with action slots
- `AdminSidebarMenu` — standalone sidebar menu
- `useScreenSize` / `useScreenSizeClass` — responsive breakpoint helpers
- `useNotifications` / `NotificationPanel` — in-app notification inbox

## Notifications

Pairs with `nubit_admin.notification.in_app.enabled` on the backend, which
exposes `GET /api/notifications`. Drop the panel into a header action:

```tsx
import type { AdminHeaderAction } from '@nubitio/admin';
import { AdminShell, NotificationPanel, useNotifications } from '@nubitio/admin';

function useNotificationsAction(): AdminHeaderAction {
  const { unreadCount } = useNotifications();

  return {
    id: 'notifications',
    icon: 'ph ph-bell',
    label: 'Notifications',
    badge: unreadCount || undefined,
    renderPanel: () => <NotificationPanel title="Notifications" />,
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell menuItems={menuItems} headerActions={[useNotificationsAction()]}>
      {children}
    </AdminShell>
  );
}
```

The hook and the panel share one react-query key, so calling `useNotifications()`
for the badge does not cause a second request.

`useNotifications({ apiUrl = '/api/notifications', staleTimeMs = 10_000 })`
returns `{ items, unreadCount, loading, markAsRead, refetch }` and stays live
over Mercure — the backend resource is `mercure: true`, so a new notification
invalidates the query without polling. `markAsRead(id)` issues the
`PATCH { read: true }` the backend expects.

`NotificationPanel` takes its strings as props (`title`, `emptyTitle`,
`markAllReadLabel`) — this package has no i18n of its own, so pass translated
values from the app.

## License

MIT
