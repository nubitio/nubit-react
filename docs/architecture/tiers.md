# Complexity tiers

How much code you need per feature class.

## Tier 1 — Schema-only (target: &lt; 30 min)

**When:** flat CRUD — products, customers, categories.

| Layer | Work |
| --- | --- |
| PHP | Entity + `#[ApiResource]` + `#[ApiFilter(DataGridFilter)]` + `x-crud` per field |
| Frontend | `defineResource(url)` + `<SchemaCrudPage />` + menu route |
| Processor | None |

**Example:** `nubit-skeleton/src/Entity/Product.php` + `ProductsPage.tsx` (3 lines).

## Tier 2 — Schema + frontend directives

**When:** tweak inferred fields without duplicating the full schema.

| Layer | Work |
| --- | --- |
| PHP | Same as Tier 1 |
| Frontend | `defineFieldContract({ source: 'hydra', directives: [...] })` |

Use `override`, `remove`, `prepend`, `append` directives — not a full manual `fields` array.

## Tier 3 — ERP / master-detail

**When:** documents with lines, workflows, sequences, row-level locks.

| Layer | Work |
| --- | --- |
| PHP | Parent + child entities, serialization groups, `#[EmbeddedLines]`, optional `#[Sequence]` / `#[Workflow]`, custom `StateProcessor` |
| Frontend | `formDetail` overrides only (fields inferred from `x-embedded-lines`), `permissions.canEditRow`, `viewMode` |
| Processor | `AbstractEmbeddedLinesProcessor` subclass |

**Example:** `Invoice.php` + `InvoicesPage.tsx`.

### Tier 3 checklist

- [ ] Serialization `Groups` on parent and child — missing group = silent field drop
- [ ] `#[EmbeddedLines(parentProperty: '…')]` on line entity
- [ ] `#[EmbeddedLines(route: '/api/…')]` on line entity (explicit route required in v1)
- [ ] Line entity `#[ApiResource]` so fields appear in `/api/docs.jsonld`
- [ ] `canView: true` when using `canEditRow` / `canDeleteRow`
- [ ] `entityField(…, '_iri', 'name')` — not `'@id'` for value field

## Choosing a tier

```
Need line items, workflow, or computed totals?
  YES → Tier 3
  NO  → Need field tweaks Hydra cannot express?
          YES → Tier 2
          NO  → Tier 1
```