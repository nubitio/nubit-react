# Debug breakpoints

Where to stop when something misbehaves.

## Backend (Symfony / PHP)

| Symptom | File | Method |
| --- | --- | --- |
| Field missing from API docs | `TranslatedDocumentationNormalizer.php` | `normalize()` |
| x-crud not in Hydra output | same | `injectPropertyCrud()` |
| Grid filter ignored | `DataGridFilter.php` | `filterProperty()` |
| Pagination headers wrong | `ApiResponseListener.php` | `onKernelResponse()` |
| Validation → 422 shape | `ExceptionListener.php` | `onKernelException()` |
| Embedded lines route wrong | `EmbeddedLinesRegistry.php` | `discover()` |
| Sequence not stamped | `SequenceStampListener.php` | `prePersist()` |
| Workflow transition fails | `WorkflowTransitionController.php` | `__invoke()` |

**CLI:** `bin/console nubit:discover` lists resources, routes, and attribute-driven features.

## Frontend (React / TypeScript)

| Symptom | File | Function |
| --- | --- | --- |
| Wrong field type | `HydraToFieldMapper.ts` | `mapHydraSchemaToFields()` |
| x-crud hint not applied | same | `applyCrudHints()` |
| Schema not loading | `useResourceSchema.ts` | hook body |
| Fields empty / error | `ResourceSchema.tsx` | `useResolvedResourceFields()` |
| Permission buttons missing | `usePermissions.ts` | `usePermissions()` |
| Grid query shape | `HydraRemoteDataSource.ts` | `load()` |
| Cell render wrong | `cellRendering.ts` | `renderCell()` |
| Form submit payload | Field-Type module | `serializeFormValue()` |

## Quick checks without a debugger

```bash
# Backend contract
curl -s http://localhost:8000/api/docs.jsonld | jq '.["hydra:supportedClass"][] | select(."@id"=="#Product")'

# Discover all Nubit resources
docker compose exec app php bin/console nubit:discover

# Frontend dev hint (localhost only)
# Open browser console — look for [SmartCRUD] after page load
```

## FrankenPHP stale metadata

If new entity properties do not appear in `/api/docs.jsonld`:

```bash
docker compose exec app php bin/console cache:clear
docker compose restart app
```