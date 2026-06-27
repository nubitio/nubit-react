# Field resolution

How `SchemaCrudPage` decides which `Field[]` to render.

## Decision tree

```
resource.fieldContract?.source === 'manual'?
  YES → resolveSmartCrudFields(contract only)
  NO  → resource.fields non-empty?
          YES → pass-through (no Hydra fetch)
          NO  → useResourceSchema(apiUrl)
                  → mapHydraSchemaToFields
                  → apply fieldContract directives (augment/replace)
```

## Hydra mapping rules (priority order)

Implemented in `packages/hydra/HydraToFieldMapper.ts`:

| Rule | Condition | Result |
| --- | --- | --- |
| 1 | `name === 'id'` or `'@id'` | Hidden identity field |
| 2 | `readable: false` | Skip |
| 3 | `writeable: false` | `noneField` (display-only) |
| 3.5 | `enum` on scalar | `enumField` (select) |
| 3.55 | `x-crud.format: image\|file` | `imageField` / `fileField` |
| 3.6 | `x-crud.format: currency` | `currencyField` |
| 4 | `range: boolean` | `switchField` |
| 5 | `range: dateTime` | `datetimeField` |
| 6 | `range: integer` | `numberField` (precision 0) |
| 7 | `range: decimal` | `numberField` |
| 8 | entity / `Link` | `entityField` |
| 9 | fallback | `textField` |

After mapping, `x-crud` hints override inferred values.

## x-crud hint reference

| Hint | Effect | Preferred name |
| --- | --- | --- |
| `filterable` | Grid filter row | — |
| `sortable` | Column sort | — |
| `hidden` | Hide in **grid** | Prefer `hideInGrid` |
| `hideInGrid` | Hide in **grid** | ✅ |
| `visibleOnForm` | Show in form (default true) | Prefer `showInForm` |
| `showInForm` | Show in form | ✅ |
| `order` | Column order | — |
| `format` | `currency` / `image` / `file` | — |
| `readonly` | Read-only in create/edit form | — |
| `summable` | Grid footer aggregate | — |

## Master-detail (embedded lines)

When the backend publishes `x-embedded-lines` on the parent resource class,
`SchemaCrudPage` auto-builds `formDetail` (URL, property name, line fields)
from the API doc. Override behaviour with `formDetail: { propertyName: 'lines', … }`.

Manual `formDetail.fields` still override inferred fields when provided.
Opt out with `formDetail: { inferFields: false }`.

**Requirement:** the line entity must appear in `/api/docs.jsonld` (typically as an
`#[ApiResource]` with `x-crud` hints) for field inference to work. Route and
`propertyName` always come from `x-embedded-lines` on the parent.

## Post-mapping pipeline (`useSmartCrudFields`)

1. Operation semantics (create-only / edit-only fields)
2. RBAC (`useFieldPermissions`)
3. Conditional rules (`visibleWhen`, `computed`, …)
4. Dependency invalidation (`useDependsOn`)
5. Field state merge

Grid uses step 1–2 only; form uses the full pipeline.

## Dev introspection

- Browser console: `[SmartCRUD]` hint with `mappingReason` per field
- UI: Nubit DevTools panel (`createNubitApp({ devTools: true })`) — grid fields, line-field inference (`inferred` / `manual` / `opt-out`), reload URL, line class
- Raw contract: `GET /api/docs.jsonld` → search `x-crud` on `hydra:supportedProperty`