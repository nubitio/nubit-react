# @nubit/crud

The Nubit CRUD engine: declarative resource pages with a data grid, dialog form, field DSL, RBAC, conditional rules, URL routing, audit trail, and pluggable backend adapters.

## Install

```bash
npm install @nubit/crud @nubit/core @nubit/ui
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
import '@nubit/ui/tokens.css';   // design tokens
import '@nubit/ui/style.css';    // UI primitives styles
import '@nubit/crud/style.css';  // grid + form styles
```

## Quick start

```tsx
import { SmartCrudPage, defineResource, textField, numberField } from '@nubit/crud';
import { HydraAdapter } from '@nubit/crud';

const products = defineResource('/api/products', {
  title: 'Products',
  adapter: HydraAdapter,
  fields: [
    textField('name').label('Name').required(),
    numberField('price').label('Price').format('currency'),
  ],
});

export function ProductsPage() {
  return <SmartCrudPage resource={products} />;
}
```

## Key exports

### Engine
| Export | Description |
|--------|-------------|
| `SmartCrudPage` | Main component — resolves schema, applies rules, renders grid + form |
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
| `defineFieldContract` | Type-safe field contract for `SmartCrudPage` |
