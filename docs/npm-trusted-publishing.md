# Releasing to npm with trusted publishing (OIDC)

`@nubitio/*` packages publish from the [`Release`](../.github/workflows/release.yml)
workflow using **npm trusted publishing**: GitHub mints a short-lived OIDC token
for the run, npm exchanges it for publish rights, and no long-lived token is
stored in the repository.

This replaced token-based publishing because npm is retiring 2FA-bypass tokens:
they lost account/package management in July 2026 and lose direct publish around
January 2027, reduced to reading private packages and staging a release.

## One-time setup (per package)

A trusted publisher is configured **per package**, so all nine need it. On
[npmjs.com](https://www.npmjs.com): package → **Settings** → **Trusted
Publisher** → **GitHub Actions**, then:

| Field                | Value         |
| -------------------- | ------------- |
| Organization or user | `nubitio`     |
| Repository           | `nubit-react` |
| Workflow filename    | `release.yml` |
| Environment name     | _(empty)_     |

Everything is case-sensitive and npm does **not** validate it when saved —
a typo only surfaces as a failed publish. `release.yml` is the filename only,
not a path.

**Allowed actions.** `npm stage publish` is always allowed. Tick direct
`npm publish` to let the workflow publish without a human step. Leave it
unticked to require a maintainer to approve each version with 2FA (npm's
recommended posture). The workflow publishes directly, so keep it ticked unless
staged publishing is adopted deliberately.

Existing connections cannot be edited; delete and recreate to change one.

## Releasing

Unchanged from before — the tag is the trigger:

```bash
node scripts/set-version.mjs X.Y.Z
git commit -am "chore: set the version to X.Y.Z"
# merge to main, then tag the merge commit
git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z
```

`main` is protected, so commits land through a PR first; the tag then points at
the merge commit. The workflow validates the tag against
`packages/core/package.json`, runs lint/typecheck/tests/build/publint, publishes
every package whose version is not yet on the registry, and creates a GitHub
Release.

## Requirements and constraints

- **npm CLI ≥ 11.5.1** — enforced by the "Ensure npm CLI supports trusted
  publishing" step. Node 24 is used because Node 22 ships npm 10.x.
- **Node ≥ 22.14.0**.
- **pnpm 10.x** — pinned at `10.30.2` in `packageManager`. Since pnpm 11,
  `pnpm publish` is implemented natively instead of delegating to the npm CLI,
  and early 11.x releases did not reach npm's OIDC flow; combined with the
  `pnpm/action-setup` fix (v6.0.6+) that path works, but 10.30.2 is the
  version verified end-to-end here.
- **`repository.url` in every `package.json` must match this GitHub repo** —
  npm rejects a publish whose manifest points elsewhere.
- **Provenance** is generated automatically, and only for public packages in a
  public repository. This repo qualifies.

## Troubleshooting

- **`404 Not Found - PUT https://registry.npmjs.org/<pkg>`** — npm's masked
  response for _any_ authentication failure, not a missing package. Check the
  trusted publisher exists, that the workflow filename matches exactly, and
  that `id-token: write` is still set.
- **`ENEEDAUTH` / "Unable to authenticate"** — almost always a workflow
  filename or repository mismatch in the trusted publisher config.
- **`npm whoami` proves nothing here** — OIDC authentication happens only for
  the duration of the publish/stage operation, so `npm whoami` reports the
  absence of a token even when trusted publishing is working.
- The npm-side config cannot be set with a 2FA-bypass token; it needs an
  interactive 2FA session.
