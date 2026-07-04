# @nubitio/devextreme

Optional DevExtreme-backed grid and form views for `@nubitio/crud`. Use this package when your team already has a DevExtreme license and wants DataGrid / Form instead of the native Nubit controls.

The CRUD engine (field DSL, adapters, RBAC, routing, shells) stays in `@nubitio/crud`. This package only swaps the two view implementations.

## Install

```bash
npm install @nubitio/devextreme @nubitio/crud @nubitio/core @nubitio/ui devextreme devextreme-react
```

`devextreme`, `devextreme-react`, and `@nubitio/ui` are **peer dependencies** — install them in your app. DevExtreme requires a valid commercial license.

## Setup

Import DevExtreme styles in your app entry (before or after Nubit styles):

```ts
import 'devextreme/dist/css/dx.light.css';
import '@nubitio/ui/style.css';
import '@nubitio/crud/style.css';
```

Wrap CRUD pages with the provider:

```tsx
import { DevExtremeCrudProvider } from '@nubitio/devextreme';
import { SchemaCrudPage, defineResource, textField } from '@nubitio/crud';

const products = defineResource('/api/products', {
  title: 'Products',
  fields: [textField('name').label('Name')],
});

export function ProductsPage() {
  return (
    <DevExtremeCrudProvider>
      <SchemaCrudPage resource={products} />
    </DevExtremeCrudProvider>
  );
}
```

`CrudPage`, `SchemaCrudPage`, and `SmartCrudPage` all read the active view pair from `CrudViewProvider`.

## Partial override

Swap only one view if needed:

```tsx
<DevExtremeCrudProvider views={{ DataGridView: DevExtremeDataGridView }} />
```

## Supported today

| Feature | DevExtreme adapter |
|---------|-------------------|
| Remote paging / sort | `CustomStore` → `ResourceStore` |
| Server-side filters | `convertDxFilterToNubit` + per-field `buildFilterTerms` |
| Routing filters (`CrudPage` URL state) | merged via `mergeGridFilters` |
| Popup CRUD (add/edit/delete) | toolbar + command column |
| Inline edit `row` / `cell` / `batch` | `Editing` + `CustomStore.update` |
| Batch save hook | `onBatchSave` / `GridHandle.saveChanges()` |
| Dialog form save | `useFormSubmit` + dxForm |
| Master-detail form lines | `DevExtremeFormDetailGrid` |
| Expanded-row grid detail | `DevExtremeDetailGridSection` via `MasterDetail` |
| File fields | `FileUploadField` from `@nubitio/crud` |

## Demo

`examples/admin-demo` includes a **Users (DevExtreme)** route at `/users-dx` that wraps `CrudPage` with `DevExtremeCrudProvider` and demonstrates master-detail posts per user.

## Still native-only

- Mobile card layout for the main grid
- `html` / `contentRender` custom field renderers
- Column presets UI (fields still respect `visibleColumns`)

Extend `mapFieldsToDxColumns` / `mapFieldsToDxFormItems` or pass custom components through `views` for further parity.

## License

`@nubitio/devextreme` is MIT. DevExtreme itself requires a separate commercial license from DevExpress.