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
    <CoreProvider apiBaseUrl="https://api.example.com" timezone="UTC" locale="en">
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
- A Nubit backend stores timestamps in UTC and reports the display zone as `timeZone` in `GET /api/me`; pass that to the provider so the client formats the way the server intends.

## Money

Monetary values arrive as `{ amount, currency, scale, minorAmount }` and are handled exactly — never as a JavaScript number.

```ts
import { parseMoney, formatMoney, sumMoney, parseMoneyInput } from '@nubitio/core';

const total = sumMoney(rows.map((row) => parseMoney(row.total)!)); // exact
formatMoney(total, { showCurrency: true }); // "€1,234.50" in the active locale
parseMoneyInput('1.234,56', 'EUR', 2); // accepts the locale's separators
```

`amount` is the authority, not `minorAmount`: the latter is a JSON number, and past 2^53 minor units a JSON number is already approximate. Everything here parses the decimal string into a `BigInt`, which is exact at any size.

`sumMoney` returns `null` for mixed currencies rather than a total. A footer that adds euros to dollars is worse than an empty one, because it looks right.

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

### Dynamic headers (Bearer tokens)

Apps that keep an access token in memory or storage — instead of relying solely on the cookie session — use `getAuthHeaders`. It is called before _every_ request (including the built-in refresh request), so a rotated token is picked up without reconstructing the client:

```ts
const httpClient = createCoreHttpClient({
  baseUrl: '/api/',
  getAuthHeaders: () => {
    const token = tokenStore.get(); // read fresh each call, not captured once
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});
```

Omit it (or return `{}`) to keep pure cookie-based behavior.

### CSRF tokens

Backends that protect state-changing requests (POST/PUT/PATCH/DELETE) with a CSRF token — a common `X-CSRF-Token` / cookie double-submit setup — use `getCsrfToken`. It is only consulted for those methods; GET/HEAD never trigger a token lookup.

```ts
const httpClient = createCoreHttpClient({
  baseUrl: '/api/',
  getCsrfToken: () => readCookie('CSRF_TOKEN'),
  // csrfHeaderName: 'X-CSRF-Token',  (default)
});
```

Return `undefined` to skip the header for a given call.

### Correlation ids

Set `enableCorrelationId` to attach a per-request `X-Request-Id` (configurable via `correlationIdHeaderName`) that your backend can log alongside its own traces:

```ts
const httpClient = createCoreHttpClient({
  baseUrl: '/api/',
  enableCorrelationId: true,
});
```

- The id is returned on `CoreHttpResponse.correlationId` and `CoreHttpError.correlationId`, so an error UI can show a support reference — including when the request never received a response at all (network failure, timeout), because the id is minted client-side before sending.
- One 401 → refresh → retry sequence keeps a single id across both attempts.
- Requests to an absolute `http(s)://` URL are left untouched (no header added), so third-party calls don't gain a custom header that could trigger a CORS preflight.
- `getCorrelationId` overrides generation (deterministic tests, or reusing an id minted earlier, e.g. for an offline-queued mutation). `generateCorrelationId` is exported for the latter case.

### Header precedence

For any single request, headers are merged in this order, with later entries winning: static locale → `getAuthHeaders` → `getCsrfToken` → correlation id → the call's own `config.headers`. A specific call can therefore override anything the config-level hooks produced.

See `CoreHttpClientConfig` for all options.

## Key exports

| Export                                      | Description                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `CoreProvider`                              | Root provider — wraps HTTP, i18n, React Query, and runtime config       |
| `CoreHttpClient`                            | Type-safe HTTP client with error normalisation + pluggable auth refresh |
| `dispatch` / `useEvents`                    | Lightweight event bus for cross-component communication                 |
| `createCrudEvents`                          | Factory for typed CRUD event sets                                       |
| `MercureProvider`                           | Real-time SSE integration via Mercure hub                               |
| `DateUtils`                                 | Timezone-aware date formatting powered by Luxon                         |
| `coreTranslationsEs` / `coreTranslationsEn` | Built-in translations for Spanish and English                           |
