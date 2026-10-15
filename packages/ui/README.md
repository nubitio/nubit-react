# @nubitio/ui

Visual primitives and theme system for the Nubit admin stack: buttons, dialogs, drawers, cards, form controls, date pickers, badges, and a light/dark theme with density and accent-color support.

## Install

```bash
npm install @nubitio/ui
```

## Peer dependencies

```json
"react": "^19",
"react-dom": "^19"
```

## Usage

```tsx
import { ThemeProvider, Button, AppDialog, Card } from '@nubitio/ui';
import '@nubitio/ui/style.css';

export function App() {
  return (
    <ThemeProvider>
      <Card>
        <Button variant="primary">Save</Button>
      </Card>
    </ThemeProvider>
  );
}
```

## What's inside

- **Primitives** — `Button`, `IconButton`, `Badge`, `Chip`, `Toggle`, `Avatar`, `Skeleton`, `EmptyState`, `StatCard`, `Card`, `CollapsibleSection`
- **Overlays** — `AppDialog`, `ConfirmDialog`, `Drawer`, `Popover`, `ContextMenu`, `AppDropdown`
- **Form controls** — `TextField`, `TextAreaField`, `SelectField`, `FormField`, `DatePicker`, `DateRangePicker`
- **Theming** — `ThemeProvider`, `ThemeSwitcher`, `DensityProvider`, `useAccentColor`, `SettingsPanel`
- **Layout** — `AppToolbar`
- **Selection and navigation** — `Checkbox` (native, including mixed state), `RadioGroup` (native radios), `Tabs` (controlled, keyboard navigation)
- **Loading** — `Spinner`, `Progress` (native determinate or indeterminate progress)

### Selection, tabs and loading

```tsx
<Checkbox label="Receive updates" checked={updates} onChange={(event) => setUpdates(event.target.checked)} />
<RadioGroup label="Channel" name="channel" value={channel} onChange={setChannel}
  options={[{ value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]} />
<Tabs aria-label="Account sections" value={tab} onChange={setTab} keepMounted
  items={[{ value: 'general', label: 'General', content: <AccountForm /> },
          { value: 'activity', label: 'Activity', content: <Activity /> }]} />
<Spinner label="Loading account" />
<Progress label="Upload" value={40} />
```

`Checkbox` accepts native input props and forwards its input ref. Its `onChange`
receives the native React change event. Use `indeterminate` for partial selection;
it does not change the submitted checked value. Supply a label or `aria-label`.

`RadioGroup` uses a fieldset and legend, shares a native radio name, and supports
disabled options and horizontal/vertical layout. Supply `label` or `aria-label`.

`Tabs` supports arrow keys, Home/End, disabled tabs and horizontal/vertical
orientation. The default `activationMode="automatic"` selects on arrow navigation;
`manual` selects with Enter/Space or click. Set `keepMounted` to preserve inactive
panel state. Values must be unique and `value` should identify an enabled item.

`Spinner` is decorative without a label; labelled spinners expose a status role.
`Progress` defaults to `max={100}`; omit `value` for indeterminate progress.
Supply a visible label or `aria-label`. Localize labels in the application.
All five components are also exported by `@nubitio/react-admin`.

### Combobox and tooltip

```tsx
<Combobox label="Country" name="country" value={country} onChange={setCountry}
  options={[{ value: 'pe', label: 'Peru' }, { value: 'cl', label: 'Chile' }]}
  helpText="Type to filter countries" />
<Tooltip content="Download the report">
  <Button>Export</Button>
</Tooltip>
```

Combobox uses Apache-2.0-licensed React Aria Components; Tooltip uses MIT-licensed
Base UI. Both provide interaction and positioning, with Nubit CSS tokens for
presentation. Applications do not need to install these libraries separately. `TooltipProvider` is optional and shares hover delays across
nearby tooltips. Both libraries are runtime dependencies and stay external in published Nubit
bundles.

`Combobox` is a controlled, single-select control: `value` is an option ID or `null`,
and `onChange` receives that ID or `null` when cleared. IDs must be unique. The
input filters the supplied options locally by label; free text is not a selected
value. It supports disabled options, required/read-only/disabled states, native
form submission through `name`, and forwards its input ref. Use `label` or
`aria-label` for its accessible name. `error` and `helpText` are linked to the
input; errors also set `aria-invalid`. Action and empty-result strings come from
`UiStringsProvider`, with `openLabel`, `clearLabel` and `emptyMessage` overrides.

`MultiSelect` uses the same options and loading API. Its `value`/`onChange` use
arrays of string IDs, rendered as keyboard-accessible removable chips. Read-only
and disabled selections cannot be removed. `name` submits one native form entry
per selected ID (`new FormData(form).getAll(name)`). `selectedLabel` and
`removeLabel(option)` customize chip accessibility strings.

```tsx
<MultiSelect
  label="Countries"
  name="countries"
  value={countries}
  onChange={setCountries}
  options={countryOptions}
/>
```

### Remote search and pagination

Pass a stable `loadOptions` callback to either component. It receives the trimmed
query and `{ signal, cursor }` and returns `{ options, nextCursor? }`. `cursor` is
absent for the first page; return `null` or omit `nextCursor` to stop pagination.
An empty query loads the default first page. Search is debounced (250 ms by
default), aborts when the query/session changes, and ignores obsolete responses
even when a loader ignores its signal. Failures are shown with a retry action.

```tsx
const loadPeople: ComboboxLoader = async (query, { signal, cursor }) => {
  const params = new URLSearchParams({ q: query, cursor: String(cursor ?? '') });
  const response = await fetch(`/api/people/options?${params}`, { signal });
  if (!response.ok) throw new Error('Could not load people');
  return response.json(); // { options: [{ value, label }], nextCursor? }
};

<Combobox
  label="Person"
  value={person}
  onChange={setPerson}
  options={selectedPersonOptions}
  loadOptions={loadPeople}
/>;
```

Seed `options` with selected records, including those outside the current page.
Selected labels are retained across searches; chosen options remain pinned in
the remote list. Server results are not filtered again on the client. Pages
are appended and deduplicated by ID; scrolling near the bottom, PageDown or the
Load more action requests the next page. `minSearchLength` defaults to 0;
`debounceMs` adjusts the delay. `loadingMessage` and `searchErrorMessage` override
the localized search statuses.

### CRUD relation integration

Native CRUD forms use `Combobox` for single `ENTITY` relations and `MultiSelect`
for `TAGS` and `ENTITY.multiple` relations. No new backend hints are required.
Existing value/text fields, filters, `byKeyUrl`, prepend records, rich
`itemFormatter` options and `onSelect` callbacks remain supported. A selection
missing from the loaded page is resolved through the resource store's `byKey`.
Numeric IDs (including zero) retain their original types, and Hydra relations
retain their IRIs when serialized.

Relation search uses the existing resource store with 50-row pages and
`searchEnabled`/`searchExpr`. Grid filters and inline detail cells continue to
edit a single relation. REST and Hydra stores forward cancellation signals to
HTTP requests; custom stores receive `ResourceLoadOptions.signal` and can honor
it as well. Selection labels are pinned in the UI rather than prepended to
server pages, so selected rows do not distort pagination offsets.

`Tooltip` accepts a single native focusable element or a component that forwards
its DOM ref and injected props; Nubit `Button` and `IconButton` support this.
It opens on hover or keyboard focus and dismisses on Escape. The popup adds a
supplementary description while preserving an existing `aria-describedby`.
Keep trigger labels meaningful and essential instructions visible; tooltips
are supplementary, non-interactive content and are not a touch-device help flow.
Use `side`, `delay` and `disabled` to customize behavior.

All components ship their styles in `dist/style.css`; import it once at the app root. Static design tokens (typography, spacing, radii) are included in `style.css`.

## Theming

Color/surface tokens live in runtime-switchable theme stylesheets shipped with the package (`@nubitio/ui/themes/nb-theme-light.css` and `nb-theme-dark.css`). `ThemeProvider` loads them from `basePath` (default `/themes/`) and toggles a `data-theme` attribute plus a `nb-theme-{light,dark}` class on `<html>` — copy the two theme files into your public directory (or point `basePath` wherever you serve them):

```tsx
import { ThemeProvider, ThemeSwitcher } from '@nubitio/ui';

<ThemeProvider basePath="/themes/">
  <App />
</ThemeProvider>;
```

`storageKey` (default `nb-theme`) and `themePrefix` (default `nb-theme-`) are configurable.

## Localization

Built-in strings (aria-labels, calendar buttons) default to English. Localize them once at the app root with `UiStringsProvider` — a Spanish preset ships with the package:

```tsx
import { UiStringsProvider, ES_UI_STRINGS } from '@nubitio/ui';

<UiStringsProvider strings={ES_UI_STRINGS}>
  <App />
</UiStringsProvider>;
```

Partial overrides work too (`strings={{ close: 'Schließen' }}`); missing keys fall back to English. Per-component label props (e.g. `closeLabel` on `AppDialog`/`Drawer`) win over the provider.

## License

MIT

## Accessible overlays

`AppDialog` and `Drawer` share Base UI's modal behavior: focus stays within the
active modal, background interaction and document scrolling are blocked, and
closing returns focus to the control that opened it. Drawers now have modal
semantics, matching their scrim and focus boundary. `keepMounted` preserves form
state while hiding the closed dialog from keyboard and assistive technology.
`AppDialog.initialFocus` accepts an element ref; `ConfirmDialog` uses it to focus
Cancel without stealing the focus-return target.

`ContextMenu` delegates arrow navigation, disabled items, typeahead and focus
return to Base UI Menu. `AppDropdown` delegates selection to Base UI Select;
its form, toolbar and compact variants and option values remain available.
`Popover` uses Base UI positioning, dismissal and focus return. Custom menu and
popover triggers should forward their DOM ref and button props, as Nubit Button
and IconButton do.

`SearchableAppDropdown` is a compatibility adapter around Combobox. Search is
entered directly in the control. Its `onSearch`, selected option, minimum search
length, open callback and loading/empty messages remain supported; Combobox
provides debounce, stale-response protection and retry. Non-searchable mode uses
AppDropdown. Native CRUD enum fields also use Combobox and preserve the original
option value types.

Nested controls portal within their owning modal, so calendars, combobox lists,
tooltips, menus, popovers and child modals stay inside its focus boundary. Escape
closes the active layer first. The showcase's **Nested overlays** example exercises
this combination, including a drawer and confirmation nested inside a dialog.

For a custom portalled control, use `useOverlayContainer()` as the portal target
and fall back to `document.body` outside a modal. This is also used by native grid
row menus and mobile filter sheets inside dialog or drawer views. Handle Escape
on the child panel before it bubbles to the owning dialog.

Interaction reference: [Base UI Dialog](https://base-ui.com/react/components/dialog).
