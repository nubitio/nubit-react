# @nubitio/hydra

Hydra / OpenAPI adapter for [`@nubitio/crud`](https://www.npmjs.com/package/@nubitio/crud): automatic schema discovery and remote data sources from API Platform docs.

Point it at an API Platform backend and it derives CRUD field definitions, filters, and pagination from the published Hydra/OpenAPI documentation — no hand-written schemas.

## Install

```bash
npm install @nubitio/hydra @nubitio/crud @nubitio/core
```

## Peer dependencies

```json
"@nubitio/core": "^0.1.0",
"@nubitio/crud": "^0.1.0",
"@tanstack/react-query": "^5",
"i18next": "^23",
"react": "^19",
"react-dom": "^19",
"react-i18next": "^14"
```

## Usage

Requires `CoreConfigProvider` from `@nubitio/core` in the provider tree so data loading uses the right base URL, locale, and timezone.

```tsx
import { CoreConfigProvider } from '@nubitio/core';
import { SchemaProvider, useResourceSchema, HydraRemoteDataSource } from '@nubitio/hydra';

export function App() {
  return (
    <CoreConfigProvider apiBaseUrl="https://api.example.com" locale="es" timezone="America/Lima">
      <SchemaProvider>
        {/* CRUD pages that call useResourceSchema('products') */}
      </SchemaProvider>
    </CoreConfigProvider>
  );
}
```

## Exports

- `SchemaProvider` / `useSchemaContext` / `useResourceSchema` — schema discovery from API docs
- `HydraRemoteDataSource` / `createHydraResourceStore` — paginated, filterable data sources
- `useHydraMetadata` — raw access to the parsed API doc
- `parseHydraDoc` / `parseOpenApiDoc` / `mapHydraSchemaToFields` — low-level parsing utilities

## License

MIT
