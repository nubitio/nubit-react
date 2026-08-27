# Versioning

From 1.0.0 these packages follow [semantic versioning](https://semver.org). This
document says what that promise actually covers, because "we follow semver" is
only meaningful once the surface it applies to is written down.

All `@nubitio/*` packages release in lockstep on one version number. A given
version of any package is only supported alongside the same version of the rest.

## What is public

**The public API is what each package re-exports from its `public.ts`**, and
nothing else:

| Package                | Surface                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `@nubitio/core`        | [`packages/core/public.ts`](packages/core/public.ts)               |
| `@nubitio/crud`        | [`packages/crud/public.ts`](packages/crud/public.ts)               |
| `@nubitio/hydra`       | [`packages/hydra/public.ts`](packages/hydra/public.ts)             |
| `@nubitio/ui`          | [`packages/ui/public.ts`](packages/ui/public.ts)                   |
| `@nubitio/admin`       | [`packages/admin/public.ts`](packages/admin/public.ts)             |
| `@nubitio/dashboard`   | [`packages/dashboard/public.ts`](packages/dashboard/public.ts)     |
| `@nubitio/devextreme`  | [`packages/devextreme/public.ts`](packages/devextreme/public.ts)   |
| `@nubitio/react-admin` | [`packages/react-admin/public.ts`](packages/react-admin/public.ts) |

Alongside those, three contracts are also public because applications depend on
their shape rather than on an import:

- The **`x-crud` hint vocabulary** read from the API documentation — the keys an
  entity may declare, and what each one does.
- The **grid protocol** — the query parameters and response headers a data source
  exchanges, pinned by `contracts/x-grid-protocol.fixtures.json`.
- **CSS custom properties** exposed by the themes (`--nb-*`, `--surface-*`,
  `--text-*`). Class names are not: they may be renamed in a minor.

Anything reachable by a deep import (`@nubitio/crud/field/registry/...`) is
internal. It may change or disappear in a patch. If you need something that is
only reachable that way, open an issue rather than importing it — that is the
signal it should be promoted.

## What each bump means

**Patch** — bug fixes, performance, internal refactors. Behaviour that a
correct application relied on does not change.

**Minor** — new public exports, new optional props or hints, new field types.
Existing code keeps compiling and behaving the same.

**Major** — removing or renaming anything public, changing a required prop,
changing a default that alters rendered output or the wire format.

Two things are explicitly _not_ breaking changes, because treating them as such
would freeze the project:

- **Fixing a bug so it behaves as documented.** If serialization was sending
  `null` where it should have omitted the key, correcting it is a patch even
  though output changes. Code that depended on the broken behaviour was
  depending on a defect.
- **Tightening a type to what the runtime already required.** Code that
  typechecked only because a type was too loose was already wrong at runtime.

Security fixes ship in whatever bump is smallest and land in a release of their
own where practical. See [SECURITY.md](SECURITY.md).

## Peer dependencies

React and the other peers declare the range they are tested against. Widening a
peer range is a minor; narrowing it is a major, because it can strand an
application on an older line.

## Deprecation

A public export is deprecated for at least one minor before it is removed, marked
with `@deprecated` and a note pointing at the replacement. Removal then happens in
the next major, never earlier.

## Release candidates

Prereleases (`1.0.0-rc.1`) publish under the `rc` dist-tag, so `npm install`
keeps resolving the last stable release. Opt in with `^1.0.0-rc.1`, which also
matches the final `1.0.0` — no second edit when it ships. The API of a release
candidate is not frozen: that is what the candidate period is for.
