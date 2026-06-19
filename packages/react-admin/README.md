# @nubitio/react-admin

Batteries-included admin stack for API Platform / Hydra backends. Umbrella package that re-exports [`@nubitio/core`](https://www.npmjs.com/package/@nubitio/core), [`@nubitio/ui`](https://www.npmjs.com/package/@nubitio/ui), [`@nubitio/admin`](https://www.npmjs.com/package/@nubitio/admin), [`@nubitio/crud`](https://www.npmjs.com/package/@nubitio/crud), [`@nubitio/hydra`](https://www.npmjs.com/package/@nubitio/hydra), and [`@nubitio/dashboard`](https://www.npmjs.com/package/@nubitio/dashboard) from a single install.

## Install

```bash
npm install @nubitio/react-admin
```

## Peer dependencies

```json
"@tanstack/react-query": "^5",
"i18next": "^23",
"react": "^19",
"react-dom": "^19",
"react-i18next": "^14",
"react-router-dom": "^6"
```

Icons are [Phosphor](https://phosphoricons.com) CSS classes (`ph ph-*`) used
throughout the shell, grids and forms — install and import the webfont once:

```bash
npm install @phosphor-icons/web
```

```ts
// main.tsx
import '@phosphor-icons/web/regular';
```

Without it, menu and toolbar icons render as empty squares.

## Quick start

```tsx
import {
  CoreProvider,
  AdminShell,
  SchemaProvider,
  SmartCrudPage,
  defineResource,
} from '@nubitio/react-admin';
import '@nubitio/react-admin/style.css';

const products = defineResource('/api/products', { title: 'Products' });

export function App() {
  return (
    <CoreProvider apiBaseUrl="https://api.example.com" locale="es" timezone="America/Lima">
      <SchemaProvider>
        <AdminShell title="My Admin" menuItems={menu}>
          <SmartCrudPage resource={products} />
        </AdminShell>
      </SchemaProvider>
    </CoreProvider>
  );
}
```

`SmartCrudPage` discovers the resource schema from your API Platform docs and renders a full CRUD page — datagrid with filters/sorting/pagination, create/edit forms (dialog, drawer, or page), validation, and RBAC — with zero hand-written field definitions. Use `CrudPage` with explicit field definitions when you want full manual control.

## The stack

| Package | What it provides |
| --- | --- |
| `@nubitio/core` | HTTP client, event bus, i18n, Mercure SSE, date utilities |
| `@nubitio/ui` | Visual primitives and theme system |
| `@nubitio/admin` | Responsive admin shell (sidebar, header) |
| `@nubitio/crud` | Declarative CRUD engine: field DSL, forms, datagrids, RBAC |
| `@nubitio/hydra` | Schema discovery and data sources from Hydra/OpenAPI docs |

Each package is also published separately if you only need part of the stack.

## License

MIT
