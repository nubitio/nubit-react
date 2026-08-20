# Privacy, analytics and feature flags

The canonical platform roadmap is
[`nubit-symfony/docs/platform/saas-platform-roadmap.md`](https://github.com/nubitio/nubit-symfony/blob/main/docs/platform/saas-platform-roadmap.md).
This document defines the browser-specific boundary.

## Rules

- The server decides authorization, serialization and restricted-field removal.
- Masking in React is presentation defense, never access control.
- Product analytics captures interaction; authoritative ERP facts come from backend
  domain events.
- Components depend on `FeatureFlagClient`, not a vendor SDK.
- Client flags affect presentation only unless the server independently enforces the
  same decision.
- Session replay and analytics integrations must use a deny-by-default property and
  DOM allowlist.

## Planned field metadata

```ts
export interface SensitivePresentation {
  classification: 'internal' | 'confidential';
  display: 'masked' | 'last4';
  copyAllowed?: boolean;
  analyticsAllowed?: boolean;
  replayAllowed?: boolean;
}
```

Restricted data is not a valid browser presentation classification because it must be
removed by backend serialization.

## Planned analytics API

```ts
analytics.track('crud.product.created.v1', {
  resource: 'products',
  source: 'manual-form',
});
```

The client will:

- accept a vendor-neutral adapter;
- add session, route, tenant and evaluated-variant context;
- filter properties through an allowlist;
- honor consent and tenant opt-out;
- batch/retry without blocking UI;
- avoid sending form values by default;
- expose a test adapter for deterministic assertions.

## Feature flag projection

The backend `/api/me` response may expose an allowlisted map of presentation flags.
It must not expose provider rules, targeting data, secrets or security decisions.

```json
{
  "feature_flags": {
    "new-grid": true,
    "navigation-variant": "compact"
  }
}
```

`FeatureFlagsProvider` hydrates this map. A future OpenFeature adapter may replace the
static client while preserving the same consumer hooks.

## Browser leak tests

- restricted canary values absent from serialized API fixtures;
- confidential values masked in grid, form, audit and clipboard;
- analytics captures no field values without an explicit allowlist;
- session replay masks inputs and text nodes by default;
- DevTools diagnostics contain field names/reasons but not values;
- error boundaries and console instrumentation redact structured context.

## Delivery order

1. sensitive presentation metadata and renderer;
2. clipboard/DevTools/error redaction;
3. neutral analytics provider and test adapter;
4. `/api/me` flag hydration;
5. OpenFeature and product-analytics vendor adapters;
6. consent UI and session replay hardening.
