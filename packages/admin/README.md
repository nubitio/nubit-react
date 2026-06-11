# @nubit/admin

Admin shell layout for Nubit apps: responsive sidebar with nested menus, header with action slots, and screen-size utilities.

## Install

```bash
npm install @nubit/admin
```

## Peer dependencies

```json
"react": "^19",
"react-dom": "^19",
"react-router-dom": "^6"
```

## Usage

```tsx
import { AdminShell } from '@nubit/admin';
import '@nubit/admin/style.css';

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

- `AdminShell` — full layout: sidebar + header + content area
- `AdminHeader` — standalone header with action slots
- `AdminSidebarMenu` — standalone sidebar menu
- `useScreenSize` / `useScreenSizeClass` — responsive breakpoint helpers

## License

MIT
