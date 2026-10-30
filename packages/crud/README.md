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

### Manual entity lookup validation

`EntityDropdown` accepts `id`, `required`, `invalid` and `describedBy`. Use `label`
for the accessible name and `describedBy` to connect an inline validation message
on hand-written forms. These pass through to the shared native combobox.

### Native catalog and full-page form layouts

The native grid can switch desktop presentation without creating a second data
source. Filters, sorting, selection, permissions, row actions and pagination
remain owned by the same grid. Mobile keeps its existing card presentation:

```tsx
defineResource('/api/products', {
  gridAppearance: 'page', // opt-in unframed toolbar and page heading
  quickFilterFields: ['category'], // enum/entity shortcuts into the same server query
  cardView: {
    defaultView: 'cards', // default: 'table'
    renderMedia: ({ row }) => <ProductImage product={row} />,
    renderContent: ({ row }) => <ProductCardContent product={row} />,
  },
  viewMode: 'page',
  formLayout: {
    type: 'columns',
    main: [
      { label: 'General', description: 'Catalog information', fields: ['name', 'sku'] },
      {
        label: 'Pricing',
        fields: ['price', 'cost'],
        renderAfter: (data) => <PriceSummary data={data} />,
      },
    ],
    aside: [{ label: 'Availability', fields: ['photo', 'active'] }],
  },
  formPage: {
    titles: { add: 'New product', edit: 'Edit product', view: 'View product' },
    subtitle: 'Catalog · Product details',
    saveLabel: 'Save product',
    footerContent: <SaveStatus />,
  },
});
```

`renderContent` returns **non-interactive content**: the engine supplies the
accessible open button, selection controls and permission-aware actions. Inline
row/cell/batch editing disables the desktop cards toggle. Omitting `renderContent`
uses the existing field/card-role rendering. These presentation options target
the native renderer, not the DevExtreme adapter.

`renderMedia` accompanies `renderContent` with a 140px edge-to-edge media area;
actions and selection controls remain separate accessible controls. Quick chips
show the first five loaded enum/entity choices plus an active choice beyond
that set. The filter sheet/table lookup retains access to the full collection.
Selecting a chip applies equality, resets pagination and preserves other filters.

Column sections stack below 900px of **form container width**, including inside
drawers; sidebar controls use a single column. Missing fields go into an overflow
section; duplicate assignments mount only once. `renderAfter` receives read-only
current form data and must not perform side effects. It can display summaries,
but pricing/tax/stock rules remain in the application and backend.

Page mode already has a persistent footer. `formPage` extends that footer rather
than adding a second save flow; saving disables its built-in actions. Wire both
list and record routes with `crudRoute()` and `routing.routeParam` when using
`SchemaCrudPage`. Page-mode record links load the full record before exposing an
editable form (using the resource store's `byKey`, or the HTTP item endpoint).

`emptyState.render({ onAdd, refresh })` supplies first-use content for a successful
unfiltered empty load. `onAdd` is absent when creation is unavailable or disabled;
applications must gate any additional actions with their own permissions. Filtered
empty collections offer a filter reset, failed loads offer retry, and forbidden
loads show access denied. These states never render first-use content.

Page-mode create links honor `canAdd`. Record links show a persistent error or
missing-record state when loading fails; permitted read-only records use `canView`
and have no save action. Supply `permissions.canView` explicitly for consultation.

Demo: `/catalog?visualStyle=nubit`. It uses an in-memory data source for local
create/edit/delete; changes disappear after a reload. It does not claim to save
drafts or implement ERP calculations.
Append `catalogState=empty`, `error`, `forbidden` or `readonly` to exercise those
states in the local demo. These switches are demo-only and do not affect apps.

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

## Large grids

A resource that publishes `x-grid-scale` tells the client how it expects to be read:

```ts
const { state, observe, goNext, goPrevious } = useCursorPagination();
```

Cursor pages cannot be addressed by number — each is defined by the last row of the one before it — so the walk follows the links the _server_ produced. That rules out jumping to page 400 and showing "page 12 of 500", and there is no way to fake either without asking the database for exactly the count the cursor was adopted to avoid.

`GridData` carries two extra facts for these resources. `nextPageUrl` is where the next page begins, and `totalIsEstimate` says the total is approximate or unknown — render it as "about N", never as a precise figure somebody might reconcile against. Without it, `member.length` would claim the page is the whole table: a grid reporting "10 rows" for three years of movements.

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

A compact filter toolbar can replace the filter row while retaining the same
server query, card state, pagination reset and mobile dialog:

```tsx
<DataGridView
  // ...existing grid props
  filterRow={false}
  filterToolbarFields={['issuedDate', 'paymentState']}
  filterPresets={[
    { key: 'due', label: 'Por cobrar', field: 'paymentState', operator: '=', value: 'due' },
  ]}
/>
```

Presets change only their named field. The toolbar also shows active filters,
individual removal and clear-all. Choose fields backed by the application's
actual query contract; business-specific computed filters belong to the app.
