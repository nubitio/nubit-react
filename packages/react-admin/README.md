# @nubit/react-admin

Batteries-included admin stack for API Platform / Hydra backends. Umbrella package that re-exports [`@nubit/core`](https://www.npmjs.com/package/@nubit/core), [`@nubit/ui`](https://www.npmjs.com/package/@nubit/ui), [`@nubit/admin`](https://www.npmjs.com/package/@nubit/admin), [`@nubit/crud`](https://www.npmjs.com/package/@nubit/crud), and [`@nubit/hydra`](https://www.npmjs.com/package/@nubit/hydra) from a single install.

## Install

```bash
npm install @nubit/react-admin
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

## Quick start

```tsx
import {
  CoreProvider,
  AdminShell,
  SchemaProvider,
  SmartCrudPage,
  defineResource,
} from '@nubit/react-admin';
import '@nubit/react-admin/style.css';

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
| `@nubit/core` | HTTP client, event bus, i18n, Mercure SSE, date utilities |
| `@nubit/ui` | Visual primitives and theme system |
| `@nubit/admin` | Responsive admin shell (sidebar, header) |
| `@nubit/crud` | Declarative CRUD engine: field DSL, forms, datagrids, RBAC |
| `@nubit/hydra` | Schema discovery and data sources from Hydra/OpenAPI docs |

Each package is also published separately if you only need part of the stack.

## License

MIT
