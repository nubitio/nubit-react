# Nubit Architecture

Developer-facing architecture docs for the `@nubitio/*` frontend stack and its
Symfony/API Platform contract.

**Philosophy:** convention over configuration, but never a black box.

## Start here

| Doc | When to read |
| --- | --- |
| [Pipeline](./pipeline.md) | "How does a PHP entity become a React screen?" |
| [Field resolution](./field-resolution.md) | "Why is this field a select / hidden / currency?" |
| [Complexity tiers](./tiers.md) | "How much frontend code do I need?" |
| [Breakpoints](./breakpoints.md) | "Where do I put a breakpoint to debug X?" |
| [Migration v1](./migration-v1.md) | "What changed in v0.6 / what breaks in v1.0?" |

## Golden path (simple CRUD)

1. Backend: copy `nubit-skeleton/src/Entity/Product.php` — `#[ApiResource]` + `x-crud` hints.
2. Migrate + clear cache + restart FrankenPHP if docs look stale.
3. Frontend: `defineResource('/api/products')` + `<SchemaCrudPage resource={…} />`.
4. Register route in `App.tsx`.

## Related

- Vocabulary: [`CONTEXT.md`](../../CONTEXT.md)
- Full-stack workflow: `nubit-skeleton/.agents/skills/nubit-stack/SKILL.md`
- Grid query contract: `nubit-symfony/packages/api-platform/contracts/x-grid-protocol.json`