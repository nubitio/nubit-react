# `@nubitio/views` — composed screens

> **Status: archived (2026-11-17). This package will not be built.**
> `@nubitio/views` was a proposal for a new package of composed screens. The consuming app
> (`nubit-erp`) decided against it: only one app would use it, every change would cost a
> release cycle, and the owner does not want to maintain more libraries. The components are
> built inside `nubit-erp` instead (`assets/shared/ui`), with no changes to this repo. See
> `nubit-erp` ADR-019, amendment of 2026-11-17.
>
> Kept as a record. **Appendix A (spike results)** and the behaviour rules in §3–§4 are still
> accurate and were reused as a checklist; the package boundaries, the wiring checklist and
> the "export headless symbols from `crud`" prerequisite (§1–§2) no longer apply.
>
> One correction to the text below: it says the `@nubitio/*` packages are shared by every
> Nubit product. Their consumers are `nubit-control`, `nubit-erp`, `nubit-erp-site` and
> `aqp-net`; Inbox and Billing do not use them.

Status: **proposal** (companion to `nubit-erp` ADR-019). Nothing here is
implemented yet. Names marked _working name_ may change before the first
pre-release.

`@nubitio/crud` turns a schema into a whole page. `@nubitio/views` is the
opposite trade: the caller composes the page, the package supplies the hard
parts (server-driven grid, typed forms, record layout) as components and hooks
with explicit props. Flat CRUD keeps using `SchemaCrudPage` — see
[tiers.md](./tiers.md); this package targets what Tier 3 screens fight today.

## 1. Position in the dependency graph

```
core ◄── ui ◄── crud ◄── views ──► (optional) hydra via adapter prop, never import
  ▲                         │
  └─────────────────────────┘
```

- `views` depends on `@nubitio/core`, `@nubitio/ui`, `@nubitio/crud` (public API
  only) and peers on `react`, `react-dom`, `@tanstack/react-query`,
  `react-router-dom`, `react-i18next`.
- Direct dependencies: `react-hook-form` (+ `@hookform/resolvers`) and
  `react-aria-components` (already a dependency of `ui`; the grid is built on its
  `Table`). **No** TanStack Table and **no** mandatory schema library — see
  [Appendix A](#appendix-a--spike-results-2026-11-17) for why. `@nubitio/ui` must
  **not** gain these (it stays dependency-light).
- `@tanstack/react-query` stays (peer). It is already a peer of five packages
  and ~11 KB gzip; removing it is a breaking change with no upside.
- `views` never imports `@nubitio/hydra`. Schema derivation receives `Field[]`
  and a `ResourceStore` from the caller, exactly as `crud` does. Add the rule to
  `scripts/check-package-boundaries.mjs`.

### Wiring checklist (mechanical, do first, with no behaviour)

- `packages/views/{package.json,public.ts,README.md,LICENSE}`.
- `tsdown.config.ts`: add `@nubitio/views` to `NUBIT_PACKAGES`; add
  `react-hook-form` and `@hookform/resolvers` to `RUNTIME_EXTERNAL`
  (`react-aria-components` is already there); add a `defineConfig` entry.
- `scripts/validate-packages.mjs`: add `'views'` to `packages`.
- `scripts/set-version.mjs` / release flow: include the package in the shared
  version line (all packages move together today).
- `react-admin` umbrella: re-export, decided separately (it is a convenience
  bundle; do not add by default).
- `examples/admin-demo`: one list screen and one record screen written against
  `views`, used by the e2e suite.

## 2. Prerequisite: a public headless surface in `crud`

Verified against v1.3.1: the logic `views` wants to reuse is **not exported**
from `packages/crud/public.ts`. Only `useColumnChooser`, `useCursorPagination`,
`ColumnPreset`, `AuditTrailPanel`, `PrintButton`, `useIssuedDocument`,
`FieldTypeModule`/`getFieldTypeModule`/`registerFieldType` and
`useResourceStoreFactory`/`ResourceStore` are.

Not exported today: `useGridQueryState`, `useGridDataLoader`,
`useGridSelection`, `useGridExport`, `usePermissions`, `buildFilterExpression`.

Decision for this proposal:

| Piece                                               | Action                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useGridQueryState`                                 | **Export** (typed, already has tests and a clear contract: filters, operators, sort and page as one state machine).                                                                                                                                                                                                                      |
| `buildFilterExpression` / `computeDefaultOperators` | **Export** — they define the wire filter shape pinned by `x-grid-protocol` fixtures.                                                                                                                                                                                                                                                     |
| `usePermissions`                                    | **Export**.                                                                                                                                                                                                                                                                                                                              |
| `useGridExport`                                     | **Export** if `views` offers Excel export (it should).                                                                                                                                                                                                                                                                                   |
| `useGridSelection`                                  | **Do not reuse.** It keeps selection as an array of keys and tests membership with `includes` (O(n²) on large pages) and is coupled to row snapshots. `views` gets its own selection model (§4.2).                                                                                                                                       |
| `useGridDataLoader`                                 | **Do not reuse.** It fetches with `useState`/`useEffect` and a manual sequence counter. `views` loads through TanStack Query over `ResourceStore.load`, which gives caching, dedupe, cancellation (`signal` is already in `ResourceLoadOptions`), `keepPreviousData` and invalidation for free, and matches how the ERP already fetches. |

Everything exported becomes a semver commitment of `crud`. Group it under a
documented "headless" section in `public.ts` so the surface is deliberate, and
add the symbols to the package's API snapshot test if one exists (none found;
add `public.test.ts` asserting the export list).

Open point: if the exported surface grows beyond ~10 symbols, extract it to a
small `@nubitio/query` package instead of widening `crud`. Revisit after the
pilot.

## 3. Components

All components are controlled or accept an explicit `defaultX`; none read global
config except i18n and the `ResourceStore` factory context.

### 3.1 `DataGrid<T>`

Built on React Aria Components `Table` (+ `ResizableTableContainer`), styled
with the `nb-data-table*` tokens from `@nubitio/ui`. It brings the ARIA grid
roles, row/cell keyboard navigation, sorting, selection and column resizing;
the package adds server-driven state, the selection model, sticky columns and
persistence. Server-driven by default. (TanStack Table was evaluated and
dropped: Appendix A.)

```ts
interface DataGridProps<T> {
  columns: ColumnDef<T>[]; // views' own ColumnDef (below)
  getRowId: (row: T) => string;

  // Data: exactly one source.
  query: GridQuery<T>; // from useGridQuery(); server filter/sort/page
  // rows?: T[]         // client mode for small static lists; disables query features

  selection?: GridSelectionModel; // §4.2; omit = no selection column
  onRowClick?: (row: T) => void; // also bound to Enter on the focused row
  rowActions?: (row: T) => ContextMenuItem[];
  bulkActions?: BulkAction<T>[];

  density?: 'compact' | 'comfortable';
  stickyHeader?: boolean; // default true
  stickyColumns?: { left?: string[]; right?: string[] };
  state?: GridPersistedState; // column order/visibility/width/density
  onStateChange?: (s: GridPersistedState) => void;

  emptyState?: ReactNode; // no data and no filters
  noResultsState?: ReactNode; // no data with active filters (distinct on purpose)
  errorState?: (err: GridError, retry: () => void) => ReactNode;
  footer?: GridFooter; // totals from x-grid-summary or caller
  testId?: string;
}
```

`ColumnDef<T>`: `id`, `header`, `cell?: (row) => ReactNode`, `field?: Field`
(opt-in link to a `crud` Field so sort/filter operators, `cellText` and cell
rendering come from the Field-Type registry), `align`, `defaultWidth`/`minWidth`,
`pin?: 'left'`, `sortable`, `filter` (editor kind + operators), `exportAs`.

Behaviour contract:

- **Server-driven**: sort, filters and page go to the backend as the
  `x-grid-protocol` query (`buildFilterExpression`), never filtered client-side
  in server mode. Changing filters or sort resets to page 1 (the invariant
  `useGridQueryState` already enforces).
- **Rich cells** are plain React: `cell: ({ row }) => <Badge/>`. Cells must not
  fetch; they receive what the row already contains.
- **Selection** survives pagination and re-fetch (selection model by id, §4.2),
  and "select all matching filter" is distinct from "select this page".
- **Resilience**: stale responses are discarded (query keys + `AbortSignal`);
  a failed refetch keeps the previous rows visible with an inline error.
- **Performance budget**: 100 rows/page renders without virtualization;
  virtualization is introduced only if a screen proves it needs it (measured:
  Appendix A).
- **Page indexing**: `ui/Pagination` is 1-based, `useGridQueryState.page` is
  0-based. `DataGrid` owns the conversion; screens never see both. (Found as an
  off-by-one in the spike.)
- **Stale rows while refetching**: with `placeholderData: keepPrevious` the
  previous page stays on screen until the next arrives. The grid marks itself
  `aria-busy`, dims, and ignores selection/row actions on placeholder rows
  (`isPlaceholderData`), otherwise a click can land on a row that is about to
  disappear. _Design rule from reasoning; not yet reproduced as a failure._
- **Opening a record vs. selecting rows** (RAC behaviour, observed): with
  `selectionBehavior="toggle"` and `onAction` on rows, click and `Enter` open the
  record only while the selection is empty; once any row is selected, clicking
  another cell toggles its selection and `Enter` does nothing. Decision: rows
  have **no** `onAction`; the primary column renders a real link
  (`<Link>`/`href`) to the record, so opening works the same with or without a
  selection and is middle-click/open-in-new-tab friendly. To be confirmed with
  keyboard testing in the pilot.

### 3.2 `ListView`

Composition shell, no data logic of its own.

```
<ListView>
  <ListView.Header title actions />        // PageHeader + primary action
  <ListView.Summary>…KpiMetricRow…</ListView.Summary>   // optional
  <ListView.Toolbar>                       // search, filter chips, saved views,
    …                                      // ColumnChooser, density, export
  </ListView.Toolbar>
  <ListView.Body><DataGrid … /></ListView.Body>
</ListView>
```

Slots are real children (compound component), so a screen can insert a tab bar,
a side summary or a second grid without a config option for it.

### 3.3 `EntityForm<T>`

React Hook Form. The form owns state; the caller owns layout. Validation is
**resolver-agnostic**: pass any RHF `Resolver` (Zod, Valibot, a hand-written
one) or per-field `rules`; the package does not depend on a schema library.

```ts
interface EntityFormProps<T extends FieldValues> {
  resolver?: Resolver<T>; // optional; zod/valibot/none — see Appendix A
  defaultValues: DefaultValues<T>;
  onSubmit: (values: T) => Promise<void | SubmitResult>;
  mode: 'create' | 'edit' | 'view';
  readOnlyFields?: Array<keyof T>;
  children: ReactNode; // composed with <EntityForm.Section>, <FormField>
}
```

Pieces: `EntityForm.Section` (collapsible, per-section error badge),
`FormField` (label, help, error, required, binds a control by name),
`EntityForm.Actions` (save/cancel, dirty guard, `Ctrl+S`).

Rules:

- **Conditional fields are plain code** (`watch('type') === 'SERVICE' && <…/>`);
  there is no `visibleWhen` DSL.
- **Server errors map back to fields** with the already-exported
  `mapApiViolations` from `crud` (field errors, `lines.N.field` row errors and
  unassigned messages); the package only adds a thin `applyApiViolations(form,
violations)` that feeds it to `setError` and focuses the first error. Verified
  in the spike. RHF's error is an object (`{type, message, ref}`): components
  render `error.message`, never the object (a typed wrapper prevents the
  mistake the spike made).
- **Dirty guard** uses react-router's `useBlocker`, which only works under a
  data router (react-router 6.30 throws "must be used within a data router"
  under `BrowserRouter`/`HashRouter`). The ERP's `HashRouter` is being replaced
  by `createBrowserRouter` with a single splat route (nubit-erp ADR-020), which
  keeps existing `<Routes>` working and enables the blocker. Until that lands,
  `EntityForm` falls back to `beforeunload` plus an explicit "discard changes?"
  on its own cancel action; the blocker is feature-detected, not assumed.
- **Schema from Fields (optional, later)**: a `resolverFromFields(fields)` for
  the common case (required, enum, number, date) is a convenience, not part of
  the first release. Money values stay strings end to end, mirroring
  `moneyField` (never convert to JS number).
- **Controls** come from `@nubitio/ui` (`TextField`, `Combobox` with
  `loadOptions`, date pickers, `Toggle`). `views` adds only what needs form
  context: `EntityCombobox` (resource-backed, server search, selected record
  seeded so it displays even when outside the loaded page — the same problem
  `prependEntityOption` solves in `crud`), `MoneyInput`, `FileField`.

### 3.4 `RecordView`

```
<RecordView>
  <RecordView.Header title subtitle badges workflowActions printAction />
  <RecordView.Main>…tabs / sections / lines…</RecordView.Main>
  <RecordView.Aside>…summary, ActivityTimeline, related…</RecordView.Aside>
</RecordView>
```

Built on `ui/DetailLayout` + `Tabs`. Tabs are URL-addressable
(`?tab=`), so a record section is deep-linkable. `workflowActions` is fed from the
`#[Workflow]` metadata already published by the backend (transition list +
guard block reasons), not re-declared in the UI. `printAction` wraps `crud`'s
`PrintButton` / `DocumentHistoryPanel`; `ActivityTimeline` wraps
`AuditTrailPanel`.

### 3.5 `LinesEditor<T>` — deferred

Keyboard-first editable grid with computed totals for documents (sales,
purchases, quotes). It is the hardest component (focus management, per-cell
validation, async product lookup, totals consistent with backend rounding) and
**is not part of the first releases**. It gets its own contract after the Customers and Products pilots,
informed by what `crud`'s `DetailGridSection` / form detail editor already does
and by the `#[EmbeddedLines]` contract.

## 4. Hooks

### 4.1 `useGridQuery<T>(options)`

```ts
function useGridQuery<T>(opts: {
  resource: string | ResourceStore<T>; // url resolved through the store factory
  fields?: Field[]; // enables operator defaults + filter building
  scope?: unknown[]; // appended to the query key (e.g. branchId)
  initial?: { sort?: SortRule[]; pageSize?: number; filters?: Record<string, string> };
  urlState?: boolean | { prefix: string }; // sync page/sort/filters to the URL
  placeholderData?: 'keep-previous';
}): GridQuery<T>;
```

- Key: `[resource, 'list', ...scope, { filters, sort, page, pageSize }]`.
- State machine: the exported `useGridQueryState`. Do **not** reset the page in a
  `useEffect` after a filter/sort change: the spike did, and every filter change
  issued a request for (new filter, old page) — e.g. `skip=40` against a
  filtered set — followed by the corrected one. The reset must happen in the
  same state transition, which `useGridQueryState` already guarantees.
- Pass the `AbortSignal` from react-query to `store.load`; cancelling the
  superseded request was verified in the spike (`aborted` counter). A simple
  grep finds only one ERP query forwarding `signal`, so cancellation is likely
  underused today (the grep is pattern-limited; treat 1 as a lower bound).
- Loads via `store.load({ filter, sort, skip, take, signal })`.
- Returns rows, `totalCount`, `gridSummary`, `isFetching`, `isError`, `refetch`,
  and the query-state API (setters, reset).
- `urlState` makes list screens shareable and back-button correct; opt-in,
  because embedded grids (inside a record) must not touch the URL.

### 4.2 `useGridSelection` (views' own)

Selection by id, not by row object:

```ts
interface GridSelectionModel {
  mode: 'none' | 'single' | 'multiple';
  selectedIds: ReadonlySet<string>;
  allMatching: boolean; // "all N rows matching the current filter"
  toggle(id: string): void;
  togglePage(ids: string[]): void;
  selectAllMatching(): void;
  clear(): void;
}
```

Bulk actions receive `{ ids } | { allMatching, query }` so the backend can act
on a filter rather than on thousands of ids.

### 4.3 Typed resource hooks (per app, not in this package)

`useCustomers(query)`, `useCustomer(id)`, `useSaveCustomer()` live in the
consuming app over its `httpClient` and generated OpenAPI types. `views`
provides `createResourceHooks<T>()` only if three or more screens repeat the
same shape — do not build it speculatively.

## 5. Cross-cutting rules

- **Permissions**: components receive booleans/handlers; they never call a
  global. The app wires `usePermissions` / `hasPermission`. Hidden is not
  secured — the backend voter remains the gate (same stance as `crud`).
- **i18n**: strings come from `UiStrings`/`i18next`; no hard-coded copy. Add the
  keys to `UiStrings` (ui) or `CoreTranslationKeys` (core), whichever owns the
  concept, in the same change as the component.
- **Accessibility** (acceptance, not nice-to-have): grid is a real `table` with
  `aria-sort`, `aria-selected`, roving focus for row navigation, visible focus,
  24px minimum targets (the recent `ui` work set this bar), `Esc` closes
  overlays, status never conveyed by colour alone. Forms: label association,
  `aria-describedby` for help/error, error summary focusable on failed submit.
- **Theming**: tokens only (`--surface-*`, `--text-*`, `--accent-color`),
  light/dark verified; no per-component colour literals. Density is a token
  set, not per-component CSS.
- **Responsive**: grid collapses to a card list below the existing breakpoints
  (`docs/architecture/breakpoints.md`); `RecordView` aside stacks below main.
- **Errors**: HTTP 401/403/404/409/422 map to defined UI states
  (re-auth, forbidden, not-found, stale-edit conflict, field errors). 409 on
  save offers reload-and-reapply, never a silent overwrite.

## 6. Testing strategy

- **Unit (Vitest + happy-dom)** for every hook and pure helper
  (`applyApiViolations`, `zodFromFields`, selection model, query-state reset
  invariant).
- **Component tests (Testing Library + user-event)** against a **fake
  `ResourceStore`**, mirroring the characterization-test approach in
  `CONTEXT.md`: render → filter/sort/page → select → submit → assert on the
  wire. Contract fixtures: reuse `contracts/x-grid-protocol.fixtures.json` so
  the query shape is checked against the same source as the PHP side.
- **Accessibility**: axe checks on the demo screens in the existing Playwright
  suite (`examples/admin-demo`).
- **Visual**: one baseline per archetype (list, record, form), light and dark.
- **Package gates**: the existing `pnpm check` (lint, typecheck, boundaries,
  coverage, build, publint/attw, demo build) must pass with the new package.

## 7. Versioning and rollout

- Ships on the shared version line. First release is a pre-release
  (`1.4.0-next.N`) consumed by the ERP from the registry; no `link:`/path
  dependencies in the ERP.
- Until `1.x` stabilises, breaking changes to `views` are allowed on minors but
  must be listed in `migration-v1.md`-style notes; `crud`'s newly exported
  headless symbols are stable from the release that exports them.
- Every component lands with: demo usage, tests, README section, i18n keys.

## 8. Open questions

1. One package, or `@nubitio/grid` + `@nubitio/form`? Default: one, split if
   consumers of only one half object to the dependency weight.
2. Saved views and column state: `localStorage` first (key per user + screen),
   server-side later if users ask for sharing views.
3. Whether `useGridQuery` should also support cursor pagination (`crud` has
   `useCursorPagination` and the backend a cursor/estimated-total mode); decide
   when a screen with a very large table needs it.
4. Inline cell editing in the grid: out of scope for v1; revisit with the
   `LinesEditor` design.

---

## Appendix A — Spike results (2026-11-17)

Throwaway code, not part of the package: `examples/admin-demo/src/spike/*` and
`examples/admin-demo/e2e-spike/spike.spec.ts` in a detached worktree of
`origin/main` v1.3.1 (`../nubit-react-spike`, uncommitted). 17 Playwright tests
in Chromium against a fake backend with 150 ms latency and 237 rows. **17/17
pass** after fixing defects in the spike itself (A.4: three of them are traps
the real package must avoid).

### A.1 Grid: React Aria `Table` vs TanStack Table

| Criterion                                                             | Result                                                                                                                                                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA grid roles, `aria-sort`, `aria-selected`                         | Provided by RAC.                                                                                                                                                                              |
| Server-side sort (asc → desc)                                         | Works; request carries `sort=ruc:asc`.                                                                                                                                                        |
| Debounced search                                                      | 6 keystrokes → 1 request (after the atomic-reset fix).                                                                                                                                        |
| Superseded request cancelled                                          | Yes (`AbortSignal` reaches the store; `aborted` counter increments).                                                                                                                          |
| Selection by id across pages                                          | Works with the `ids` model.                                                                                                                                                                   |
| "Select all N matching" + exclusions, cleared when the filter narrows | Works with the `allMatching` + `excluded` model.                                                                                                                                              |
| Column resize + persistence                                           | Works; widths saved on `onResizeEnd`, restored from `localStorage`.                                                                                                                           |
| Sticky first columns                                                  | Works with plain CSS (`position: sticky`); not built into RAC.                                                                                                                                |
| `ui/RowActions` menu inside a cell                                    | Works; opening it neither selects nor opens the row.                                                                                                                                          |
| Keyboard: arrows, Space, Enter                                        | Works, with the Enter caveat in §3.1 (action vs selection mode).                                                                                                                              |
| Empty / no-results state                                              | Works.                                                                                                                                                                                        |
| axe, WCAG 2.1 A/AA                                                    | **0 violations** on grid and on form.                                                                                                                                                         |
| 100 rows, rich cells (avatar, `Badge`, menu)                          | ~80–110 ms to render after data arrives; select-all click → paint ~35–130 ms (varies run to run). Headless Chromium on a dev machine: an upper bound for "fast", not a low-end device figure. |

Bundle (esbuild, minified, gzip, `react` external): `@tanstack/react-table`
13.4 KB; RAC `Table` family 70.7 KB vs RAC `ComboBox` alone 64.7 KB — i.e. the
`Table` adds **≈ 6 KB gzip on top of what `ui` already ships for `Combobox`**,
because `react-aria-components` is already a dependency. TanStack Table would be
a new dependency that adds the state model but none of the accessibility.

**Conclusion:** TanStack Table is not needed; use RAC `Table`.

**Needed that RAC does not provide:** a RAC-aware selection checkbox (`ui/Checkbox`
is a native-input wrapper and does not receive RAC's `slot="selection"` context;
the spike used RAC's `Checkbox` with a styled box), sticky columns (CSS),
persistence of column state, and the server-driven query/selection layer.

### A.2 Forms: React Hook Form

| Criterion                                                                                       | Result                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ui/TextField` via `register`                                                                   | Works (it is a `forwardRef` input).                                                                                                                                                                                                                                                                                                        |
| `ui/Combobox` (server `loadOptions`), `DatePicker`, `Toggle` via `Controller`                   | Work; dirty tracking reacts to them.                                                                                                                                                                                                                                                                                                       |
| Re-renders: typing 5 chars in one field of a 30-line form                                       | RHF: **0 line re-renders** (form re-rendered once, for `isDirty`). Single-state controlled baseline (how `crud`'s `NativeFormView` holds `formData`): **150 line re-renders** (5 keystrokes × 30 lines) and 5 form renders. The baseline is not memoised; a memoised controlled form would narrow the gap but needs per-row state lifting. |
| Totals recomputed from `useWatch` only                                                          | Works; only `Totals` re-renders on a line edit.                                                                                                                                                                                                                                                                                            |
| Field array (add/remove lines)                                                                  | `useFieldArray` works; this is the foundation `LinesEditor` needs.                                                                                                                                                                                                                                                                         |
| Cross-field rule (credit list ⇒ limit > 0)                                                      | Works (Zod `superRefine`).                                                                                                                                                                                                                                                                                                                 |
| API Platform 422 → field error, row error (`lines[1].qty`), general alert, focus on first error | Works, reusing the existing `mapApiViolations`.                                                                                                                                                                                                                                                                                            |

Library weight (gzip): `react-hook-form` 16.2 KB; `@hookform/resolvers/zod`
2.2 KB; **`zod` v4 classic 94.6 KB** (the `z` namespace does not tree-shake),
`zod/mini` 5.4 KB, Valibot 1.4 KB. Zod is also only a transitive dependency
today and nubit-react's audit already carries an ignore for it
(GHSA-mrhx-c7xc-m3w5, via devextreme).

**Conclusion:** adopt React Hook Form. Do **not** make Zod a dependency of the
package: `EntityForm` takes any RHF `Resolver`. Recommend Valibot or `zod/mini`
where a schema is wanted, and plain `rules` for simple forms.

### A.3 TanStack Query: keep

ERP: 70 files, 112 `useQuery`, 94 `useMutation`, 36 `invalidateQueries`, 26
`staleTime`, 6 `refetchInterval`, 2 `useInfiniteQuery`. nubit-react: peer of five
packages (`admin`, `crud`, `dashboard`, `hydra`, `react-admin`); `admin` creates
the `QueryClient` and `dashboard` documents the provider as a requirement.
Weight: ~11 KB gzip. Removing it means rewriting ~200 call sites and breaking the
public API of the whole `@nubitio` stack, then rebuilding caching, dedupe,
cancellation, retry and invalidation by hand. No measurable benefit identified.

**Conclusion:** keep. (Note for adoption: a pattern-limited grep found only one ERP query forwarding
`signal`, so cancellation is probably underused; `views` should use it.)

### A.4 Defects found in the spike itself

1. **Page reset in `useEffect`** → a request for (new filter, old page) before the
   corrected one. Fix: reset in the same transition (see §4.1).
2. **`Pagination` is 1-based, query page is 0-based** → every click landed one
   page off. Fix: `DataGrid` owns the conversion (§3.1).
3. **Rendering RHF's error object** as a React child (`{type, message, ref}`),
   hidden by an `as never` cast → crashed on server errors. Fix: typed `.message`
   access (§3.3).
4. Two test-only mistakes (an ambiguous locator matching RAC's column resizer
   slider, named "Resizer Estado"; and a debounce the test did not wait for).
   Not library issues.

### A.5 Not tested (do not assume)

Mobile/card collapse of the grid; `Virtualizer` and tables beyond ~100 rows;
keyboard-only column resizing; real screen-reader output (axe is automated and
catches only part of WCAG); dark-theme contrast; row grouping/tree; inline cell
editing; a `ui`-styled selection checkbox; the Enter/selection behaviour with a
link in the primary column (proposed, not run); `useBlocker` under a data router (planned in ERP ADR-020);
behaviour against the real Hydra `ResourceStore` (the spike used a fake with the
same shape).
