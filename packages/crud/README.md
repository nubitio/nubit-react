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
import '@nubitio/ui/tokens.css'; // design tokens
import '@nubitio/ui/style.css'; // UI primitives styles
import '@nubitio/crud/style.css'; // grid + form styles
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

| Export           | Description                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `SchemaCrudPage` | Main component — resolves schema, applies rules, renders grid + form |
| `CrudPage`       | Lower-level page if you manage fields manually                       |
| `defineResource` | Create a typed `ResourceConfig` for a REST/Hydra resource            |

### Field DSL

`textField`, `numberField`, `dateField`, `datetimeField`, `entityField`, `enumField`, `selectField`, `checkboxField`, `switchField`, `moneyField`, `currencyField`, `imageField`, `textareaField`, `passwordField`

Each returns a chainable `FieldBuilder` with `.label()`, `.required()`, `.visibleWhen()`, `.disabledWhen()`, `.onChange()`, `.formatter()`, and more.

### Money fields

`moneyField()` is for amounts a backend publishes as `{ amount, currency, scale }` — a resource declaring `x-crud.format: money` gets one automatically. The value is never converted to a JavaScript number: the control edits the decimal as text and submits `{ amount, currency }`, and grid totals are summed in integer minor units.

Prefer it over `currencyField()`, which is a plain number with two decimals and right alignment. Both still work; only `moneyField` keeps a grid footer equal to the total the database holds.

### Backend adapters

| Export           | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `HydraAdapter`   | API Platform / JSON-LD + Hydra (default)             |
| `RestAdapter`    | Plain REST with `{ data, total }` or array responses |
| `BackendAdapter` | Interface to implement a custom adapter              |

### Extension points

| Export                   | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `ResourceSchemaProvider` | Supply a custom field schema for a resource         |
| `ResourceStoreProvider`  | Supply a custom data store factory                  |
| `SmartCrudRolesProvider` | Inject RBAC role claims for field-level permissions |
| `defineFieldContract`    | Type-safe field contract for `SchemaCrudPage`       |

## Permissions

When the backend publishes granular permissions, `GET /api/me` carries them and the toolbar follows:

```tsx
<SessionPermissionsProvider permissions={session.permissions} limits={session.limits}>
  <App />
</SessionPermissionsProvider>
```

```ts
defineResource('/api/invoices', { permissionPrefix: 'invoice' });
```

`usePermissions` then resolves in this order: an explicit `permissions.canX` override, the session's granular permissions, the HTTP methods the resource supports, platform defaults. The session sits above the method inference because the methods say what the resource _has_ and the session says what this user may _do_ — only the second can hide a button that would come back a 403.

This decides what the UI offers, never what the API allows. The backend evaluates the same permissions in a voter, so a client that ignores the list gets a 403 rather than a result. An empty list means the backend published none (the module is off) and everything stays visible.

## Issued documents

A backend resource declaring `#[Printable]` publishes `x-printable`, and the record view gets a print action from it:

```tsx
<PrintButton
  issueUrl={schema.printable.issueUrl}
  recordId={row.id}
  allowReissue={schema.printable.allowReissue}
/>
```

Printing and issuing a correction are two separate actions on purpose. Printing is routine; a correction supersedes a document somebody may already be holding, so it confirms first. `DocumentHistoryPanel` lists every copy ever issued — including the superseded ones, which is the point: "which version did the customer receive?" is a question the archive exists to answer.

Reprinting returns the bytes that were issued, never a fresh render. That is enforced by the server; the client simply does not undermine it.

## Spreadsheet import

A resource declaring `#[Importable]` publishes `x-importable`:

```tsx
<ImportPanel uploadUrl={schema.importable.uploadUrl} onApplied={() => grid.reload()} />
```

Upload analyses the file and shows what applying _would_ do — rows to insert, rows to update, and every error by spreadsheet line — without writing anything. The apply button stays disabled while any row is invalid, because the server refuses a partial import and a button that looks available but always fails is worse than one that explains itself.

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
