# Migration guide — v0.6 → v1.0

Breaking changes and deprecations introduced in Phase 3 of the architecture
review. All deprecated APIs continue to work in v0.6 with console warnings in
development.

## `SmartCrudPage` → `SchemaCrudPage`

The schema-driven CRUD entry point is renamed for clarity. Behaviour is
unchanged.

```tsx
// Before
import { SmartCrudPage, defineResource } from '@nubitio/react-admin';
export const ProductPage = () => <SmartCrudPage resource={products} />;

// After
import { SchemaCrudPage, defineResource } from '@nubitio/react-admin';
export const ProductPage = () => <SchemaCrudPage resource={products} />;
```

`SmartCrudPage` remains exported as a thin deprecated alias until v1.0.

## `fieldOverrides` prop removed

The `fieldOverrides` prop on `SmartCrudPage` / `SchemaCrudPage` is removed.
Move overrides onto the resource via `defineFieldContract()`:

```tsx
import { defineResource, defineFields } from '@nubitio/react-admin';

const products = defineResource('/api/products', {
  title: 'Products',
  fieldContract: defineFields({
    source: 'hydra',
    strategy: 'augment',
    directives: [
      { kind: 'override', key: 'sku', patch: { label: 'SKU code' } },
    ],
  }),
});
```

Passing `fieldOverrides` to the deprecated `SmartCrudPage` wrapper still works
temporarily (it is converted to a `fieldContract` internally).

## Master-detail: automatic `formDetail` inference

When the parent resource publishes `x-embedded-lines` in `/api/docs.jsonld`,
line fields are inferred automatically. You no longer need `inferFields: true`.

```tsx
// Before
formDetail: {
  inferFields: true,
  propertyName: 'lines',
  url: embeddedLinesUrl('/api/invoice_lines', 'invoice'),
  fields: [ /* manual line fields */ ],
}

// After — only behavioural overrides
formDetail: {
  propertyName: 'lines',
  allowAdding: true,
  required: true,
  summary: { /* … */ },
}
```

Opt out with `formDetail: { inferFields: false }` or by providing manual
`formDetail.fields`.

**Requirements:**

1. Line entity has `#[ApiResource]` so its schema appears in the API doc.
2. Line entity has `#[EmbeddedLines(route: '/api/…')]` with an explicit route.
3. Parent and line properties use matching serializer `Groups`.

## x-crud `readonly` hint

Computed line/header fields can be marked read-only in the form without
dropping them from the write serializer group:

```php
#[ApiProperty(openapiContext: ['x-crud' => ['format' => 'currency', 'readonly' => true]])]
```

Display-only properties (`writeable: false` in the API doc) remain read-only
via the existing rule-3 mapping.

## x-crud hint aliases

| Deprecated | Replacement |
| --- | --- |
| `hidden: true` | `hideInGrid: true` |
| `visibleOnForm: false` | `showInForm: false` |

Legacy keys still work; dev builds log a one-time warning per field.

## Backend: explicit `#[EmbeddedLines]` route

Omitting `route` on `#[EmbeddedLines]` is deprecated. The bundle still derives
`/api/{table_plural}` but logs a `trigger_deprecation` in dev:

```php
// Before
#[EmbeddedLines(parentProperty: 'invoice', normalizationGroups: ['invoice:read'])]

// After
#[EmbeddedLines(
    parentProperty: 'invoice',
    route: '/api/invoice_lines',
    normalizationGroups: ['invoice:read'],
)]
```

## Checklist

- [ ] Rename `SmartCrudPage` → `SchemaCrudPage` in pages and docs
- [ ] Move `fieldOverrides` to `defineFieldContract()` on the resource
- [ ] Remove manual `formDetail.fields` where `x-embedded-lines` + line `#[ApiResource]` cover them
- [ ] Remove `inferFields: true` (optional — still accepted, now redundant)
- [ ] Add explicit `route` on every `#[EmbeddedLines]` attribute
- [ ] Rename `x-crud.hidden` / `visibleOnForm` hints on PHP entities