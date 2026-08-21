# @nubitio/crud

The Nubit CRUD engine: declarative resource pages with a data grid, dialog form, field DSL, RBAC, conditional rules, URL routing, audit trail, and pluggable backend adapters.

## Install

```bash
npm install @nubitio/crud @nubitio/core @nubitio/ui
```

## Peer dependencies

```json
"@tanstack/react-query": "^5",
"i18next": "^23",
"luxon": "^3",
"react": "^19",
"react-dom": "^19",
"react-i18next": "^14",
"react-router-dom": "^6"
```

## Setup

```ts
import '@nubitio/ui/tokens.css';   // design tokens
import '@nubitio/ui/style.css';    // UI primitives styles
import '@nubitio/crud/style.css';  // grid + form styles
```

## Quick start

```tsx
import { SchemaCrudPage, defineResource, textField, numberField } from '@nubitio/crud';
import { HydraAdapter } from '@nubitio/crud';

const products = defineResource('/api/products', {
  title: 'Products',
  adapter: HydraAdapter,
  fields: [
    textField('name').label('Name').required(),
    numberField('price').label('Price').format('currency'),
  ],
});

export function ProductsPage() {
  return <SchemaCrudPage resource={products} />;
}
```

## Key exports

### Engine
| Export | Description |
|--------|-------------|
| `SchemaCrudPage` | Main component — resolves schema, applies rules, renders grid + form |
| `CrudPage` | Lower-level page if you manage fields manually |
| `defineResource` | Create a typed `ResourceConfig` for a REST/Hydra resource |

### Field DSL
`textField`, `numberField`, `dateField`, `datetimeField`, `entityField`, `enumField`, `selectField`, `checkboxField`, `switchField`, `currencyField`, `imageField`, `textareaField`, `passwordField`

Each returns a chainable `FieldBuilder` with `.label()`, `.required()`, `.visibleWhen()`, `.disabledWhen()`, `.onChange()`, `.formatter()`, and more.

### Backend adapters
| Export | Description |
|--------|-------------|
| `HydraAdapter` | API Platform / JSON-LD + Hydra (default) |
| `RestAdapter` | Plain REST with `{ data, total }` or array responses |
| `BackendAdapter` | Interface to implement a custom adapter |

### Extension points
| Export | Description |
|--------|-------------|
| `ResourceSchemaProvider` | Supply a custom field schema for a resource |
| `ResourceStoreProvider` | Supply a custom data store factory |
| `SmartCrudRolesProvider` | Inject RBAC role claims for field-level permissions |
| `defineFieldContract` | Type-safe field contract for `SchemaCrudPage` |

## Grid export

```tsx
defineResource('/api/products', { permissions: { canExport: true } });
```

That renders an **Export** button in the grid's utility toolbar. Pressing it
exports every row matching the grid's **current filters and sort with
pagination dropped** — not the page on screen — and saves the file under the
name the server sent in `Content-Disposition`.

The button only appears when the resource's store implements the optional
`ResourceStore.export(options): Promise<ResourceExportResult>`. `HydraAdapter`
does (it requests the `xlsx` format as a blob, which
`nubitio/admin-bundle`'s `nubit_admin.export.enabled` serves for every
resource); `RestAdapter` does not, so `canExport: true` against a plain REST
backend is inert by design rather than rendering a button that 404s.

A failed export surfaces in the grid's own error row (`grid.exportError`) and
logs the underlying cause to the console. To back a custom backend, implement
`export()` on your own store:

```ts
const store: ResourceStore = {
  load: (options) => /* … */,
  export: async (options) => ({ blob, filename: 'products.xlsx' }),
};
```
