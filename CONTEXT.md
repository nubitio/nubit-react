# Domain Glossary

Vocabulary for nubit-react. Use these terms exactly in code, docs, and reviews.

## Field

The single description of one resource attribute, produced by the hydra
package from an API Platform doc (or built manually via the field builders)
and consumed by every crud view. Defined once in `packages/crud/field/Field.ts`.
A Field carries data only — labels, type, layout hints, options. Behaviour
belongs to its Field-Type module.

## FieldType

The closed enum of 17 kinds of Field (`packages/crud/field/FieldType.ts`):
text, password, textarea, date, datetime, number, currency, select, enum,
entity, radio, switch, checkbox, file, tags, html, none.

## Field-Type module

One module per FieldType that owns *all* behaviour for that type behind a
single interface (`FieldTypeModule`): filter operators, serialization,
validation, plain-text cell formatting (`cellText`), grid cell rendering
(`CellRender`), and form control rendering (`ControlRender`). Pure logic and
React rendering live in the same file — one file per type — so everything
about e.g. "currency" has one home. Decided 2026-06-12.

Since 2026-07-05 the module also owns the form-facing taxonomy:
`controlKind` (semantic control category adapter backends like DevExtreme map
to their own widgets), `formWidth` (col-span width class), `normalizeFormValue`
(API value → editor shape; FILE strips, PASSWORD blanks, DATE truncates,
ENTITY resolves its scalar key) and `validateDetailValue` (per-type
detail-row checks). The form, layout, DevExtreme mappers and
`normalizeFormData` read the registry instead of switching on `field.type`.

## Field-Type registry

The lookup `FieldType → FieldTypeModule` that the grid, form, serializer and
validator call through instead of switching on `field.type`. Internal to
`packages/crud`; extended at runtime via the public `registerFieldType()` API.
Per-field customization remains `Field.contentRender`.

## FilterRow

The grid's filter machinery (`packages/crud/datagrid/FilterRow.tsx`): operator
defaults, filter-expression building and the `FilterCell` component. The
type-specific filter editor comes from each Field-Type module
(`FilterCellRender`); types without one get the operator-dropdown shell with a
text input. Decided 2026-06-12.

## DetailGridSection

The expanded-row detail grid (`packages/crud/datagrid/DetailGridSection.tsx`):
loads related rows through the ResourceStore and renders cards (mobile) or a
nested table. Distinct from the form's inline detail editor, whose per-type
cell editors are the Field-Type modules' `DetailCellRender`.

## Form state

`useFormState` (`packages/crud/form/useFormState.ts`) owns the form's value
and error state: main-form data, detail rows, per-field UI state, validation
errors, upload tracking and edit mode. The backing refs never leave the hook:
writes go through intent methods (`setEditMode`, `resetUploadSession`,
`setExistingMedia`, `clearExistingMedia`, `resetPrependData`) and imperative
reads through the identity-stable `accessors` (`FormStateAccessors`:
`getFormData`, `getFieldValue`, `getDetailRows`, `getUploadedFiles`,
`isEditMode`, `getExistingMedia`, `getPrependData`, …), which also serve as
the submit/validation accessor objects. Option loading, layout and rendering
stay in `NativeFormView`. Narrowed 2026-07-05.

## Floating panel

`useFloatingPanel` (`packages/ui/useFloatingPanel.ts`) is the one home for
floating-panel behaviour: open state, outside-click + Escape dismissal,
anchored fixed-positioning recomputed on scroll/resize (with the happy-dom
0×0-rect guard), and viewport-exit close. Five adapters make it a real seam:
Popover, AppDropdown, ContextMenu, DatePicker and DateRangePicker. Shared
flip/clamp geometry lives in `computeAnchoredStyle`. Consolidated 2026-07-05.

## HydraSchemaResolver

The schema-resolution seam of the hydra package
(`packages/hydra/HydraSchemaResolver.ts`): one API doc in, Fields and
inferred form detail out. `getSchemaResolver(doc)` parses each discovery
result exactly once and callers (`useResourceSchema`,
`resolveInferredFormDetail`, `SmartCrudPage`) ask it for resources, Fields or
embedded-line inference instead of sequencing `parse* → map → infer`
themselves. Created 2026-07-05.

## ResourceStore

The data-access seam the crud views fetch through. Two adapters exist
(`HydraAdapter`, `RestAdapter`), which makes it a real seam; tests use a fake
adapter against the same interface.

## Characterization test

A test pinning current behaviour through the `SchemaCrudPage` interface with a
fake ResourceStore adapter — render, filter, edit, submit, assert on the
wire. These tests survive internal refactors because they exercise the seam,
not the implementation.
