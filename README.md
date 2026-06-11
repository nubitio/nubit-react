# Nubit React

Opinionated React admin stack for API Platform / Hydra backends — and any REST API.

Six packages, published lockstep under the `@nubitio` npm scope:

| Package | Description |
| --- | --- |
| [`@nubitio/core`](packages/core) | Runtime foundation: HTTP client, event bus, i18n, Mercure SSE |
| [`@nubitio/ui`](packages/ui) | Visual primitives and theme system (light/dark, density, accent) |
| [`@nubitio/admin`](packages/admin) | Responsive admin shell: sidebar, header, screen-size utilities |
| [`@nubitio/crud`](packages/crud) | Declarative CRUD engine: field DSL, forms, datagrids, RBAC |
| [`@nubitio/hydra`](packages/hydra) | Schema discovery and data sources from Hydra/OpenAPI docs |
| [`@nubitio/react-admin`](packages/react-admin) | Batteries-included umbrella — install this one |

## Quick start

```bash
npm install @nubitio/react-admin
```

See [`examples/admin-demo`](examples/admin-demo) for a complete app: admin shell, UI showcase, and a CRUD page running against a public REST API.

English strings by default; Spanish ships built-in (`ES_UI_STRINGS` + i18next bundles). See each package README for details.

## Development

```bash
pnpm install
pnpm build            # build all packages (tsdown + CSS + themes)
pnpm test             # vitest
pnpm typecheck
pnpm lint
pnpm validate:packages # publint + arethetypeswrong on packed tarballs
pnpm example:dev      # run the demo app (build packages first)
```

## Releasing

Versions are lockstep across all packages; release notes are GitHub Releases (no changelog files):

```bash
node scripts/set-version.mjs 0.2.0
git commit -am "release: v0.2.0"
git tag v0.2.0 && git push && git push --tags
```

The [release workflow](.github/workflows/release.yml) validates, publishes every package to npm with provenance, and creates the GitHub Release with auto-generated notes. Requires the `NPM_TOKEN` repository secret.

## License

MIT
