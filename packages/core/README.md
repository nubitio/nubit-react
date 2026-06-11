# @nubitio/core

Runtime foundation for the Nubit admin stack: HTTP client, event bus, i18n integration, date utilities, Mercure (SSE) support, and the CoreProvider.

## Install

```bash
npm install @nubitio/core
```

## Peer dependencies

```json
"i18next": "^23",
"react": "^19",
"react-dom": "^19",
"react-i18next": "^14"
```

## Quick start

```tsx
import { CoreProvider } from '@nubitio/core';

export function App() {
  return (
    <CoreProvider
      apiBaseUrl="https://api.example.com"
      timezone="UTC"
      locale="en"
    >
      {/* your app */}
    </CoreProvider>
  );
}
```

## Timezone handling

Timezone (and other core settings) are configured once via `CoreConfigProvider` (recommended) or `configureCore()`:

```tsx
<CoreConfigProvider locale="es" timezone="America/Santiago">
  <App />
</CoreConfigProvider>
```

- `getCoreTimezone()` and `DateUtils` read from this config (works in React and non-React code).
- Default is `UTC`. Use `DEFAULT_TIMEZONE` only as a fallback constant if you need one outside the provider.

## API Base URL

The base URL for your API is configured the same way as locale and timezone:

```tsx
<CoreConfigProvider
  locale="es"
  timezone="America/Santiago"
  apiBaseUrl="https://api.example.com/api/"
>
  <App />
</CoreConfigProvider>
```

- Use `getCoreApiBaseUrl()` to read it from anywhere (including at module top level inside `defineResource`, `entityField`, etc.).
- When you create an HTTP client via `CoreProvider` / `CoreHttpProvider` **without** explicitly passing `baseUrl`, it will automatically use the value from `CoreConfig`.
- Default: `/api/`

This design allows the Nubit packages to be used in other projects with almost zero configuration beyond the provider.

## HTTP client & authentication strategies

`CoreHttpClient` includes a built-in convenience refresh loop for **cookie-based** auth (the most common case for API Platform backends).

```ts
const httpConfig = {
  baseUrl: 'https://api.example.com',
  refreshPath: 'auth/refresh',
  loginPath: 'auth/login',
  // autoRefresh: true  (default)
};
```

**For other auth models (Bearer JWT, custom headers, OAuth, etc.)** we strongly recommend:

```ts
<CoreProvider
  http={{
    baseUrl: '...',
    autoRefresh: false,           // disable built-in cookie refresh
    onUnauthorized: (err) => {
      // your global logout / redirect logic
      authStore.logout();
    },
  }}
>
```

You can also provide a full `refreshFn` if you want the client to still participate in refresh, but with your own logic (e.g. refreshing a Bearer token).

See `CoreHttpClientConfig` for all options.

## Key exports

| Export | Description |
|--------|-------------|
| `CoreProvider` | Root provider — wraps HTTP, i18n, React Query, and runtime config |
| `CoreHttpClient` | Type-safe HTTP client with error normalisation + pluggable auth refresh |
| `dispatch` / `useEvents` | Lightweight event bus for cross-component communication |
| `createCrudEvents` | Factory for typed CRUD event sets |
| `MercureProvider` | Real-time SSE integration via Mercure hub |
| `DateUtils` | Timezone-aware date formatting powered by Luxon |
| `coreTranslationsEs` / `coreTranslationsEn` | Built-in translations for Spanish and English |
