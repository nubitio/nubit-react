# Request & render pipeline

End-to-end flow from developer code to persisted data.

```
Developer
    │
    ▼
Entity (PHP)                    ← single source of truth for simple CRUD
    │  #[ApiResource] #[ApiProperty] x-crud hints
    ▼
API Platform metadata
    │
    ▼
TranslatedDocumentationNormalizer (+ sequence/workflow decorators)
    │  injects x-crud, enum, x-crud-layout into /api/docs.jsonld
    ▼
GET /api/docs.jsonld            ← frontend contract
    │
    ▼
createNubitApp() provider tree
    │  MercureProvider → SchemaProvider → HydraResourceSchemaProvider → HydraResourceStoreProvider
    ▼
defineResource(url) + route
    │
    ▼
SchemaCrudPage
    │  useResolvedResourceFields → mapHydraSchemaToFields
    │  useSmartCrudFields (RBAC, rules, operation semantics)
    ▼
CrudPage
    │  permissions, toolbar, view mode (dialog/drawer/page)
    ▼
NativeDataGridView + NativeFormView
    │  Field-Type registry (CellRender / ControlRender)
    ▼
ResourceStore → HydraRemoteDataSource → CoreHttpClient
    │  sort, filter, searchValue (x-grid-protocol)
    ▼
API Platform + DataGridFilter
    │
    ▼
Doctrine ORM (+ listeners: sequence, tenant, audit, soft-delete)
```

## Where developers lose the thread

| Step | Risk | Mitigation |
| --- | --- | --- |
| x-crud in PHP → UI | Metadata crosses 3 layers | `bin/console nubit:discover`, Nubit DevTools panel |
| Field inference | 9 mapping rules + heuristics | `logDevHint` in browser console, `field.mappingReason` |
| Master-detail | Header from Hydra, lines from `x-embedded-lines` inference | Tier 3 checklist in [tiers.md](./tiers.md) |
| FrankenPHP cache | Stale docs after entity change | `cache:clear` + restart app container |
| Provider tree | Cryptic "no resolver" errors | See [breakpoints.md](./breakpoints.md) |

## Provider tree (frontend boot)

```
CoreProvider
  └── CoreConfigProvider
        └── SmartCrudRolesProvider
              └── BrowserRouter
                    └── MercureProvider          (skip if hydra: false)
                          └── SchemaProvider
                                └── HydraResourceSchemaProvider
                                      └── HydraResourceStoreProvider
                                            └── AdminShell + routes
```

Use `createNubitApp({ devTools: true })` to inspect active providers in development.