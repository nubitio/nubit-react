# @nubit/hydra

Hydra / OpenAPI adapter for [`@nubit/crud`](https://www.npmjs.com/package/@nubit/crud): automatic schema discovery and remote data sources from API Platform docs.

Point it at an API Platform backend and it derives CRUD field definitions, filters, and pagination from the published Hydra/OpenAPI documentation — no hand-written schemas.

## Install

```bash
npm install @nubit/hydra @nubit/crud @nubit/core
```

## Peer dependencies

```json
"@nubit/core": "^0.1.0",
"@nubit/crud": "^0.1.0",
"@tanstack/react-query": "^5",
"i18next": "^23",
"react": "^19",
"react-dom": "^19",
"react-i18next": "^14"
```

## Usage

Requires `CoreConfigProvider` from `@nubit/core` in the provider tree so data loading uses the right base URL, locale, and timezone.

```tsx
import { CoreConfigProvider } from '@nubit/core';
import { SchemaProvider, useResourceSchema, HydraRemoteDataSource } from '@nubit/hydra';

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
