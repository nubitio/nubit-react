# @nubitio/ui

Visual primitives and theme system for the Nubit admin stack: buttons, dialogs, drawers, cards, form controls, date pickers, badges, layout, data tables, and a light/dark theme with density and accent-color support.

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

CSS is bundled from each component import via `public.ts` (not a separate `style.scss` aggregator). Import `dist/style.css` once at the app root.

## What's inside

- **Primitives** — `Button`, `IconButton`, `Badge`, `Chip`, `Toggle`, `Checkbox`, `Radio` / `RadioGroup`, `Avatar`, `Skeleton`, `Spinner`, `EmptyState`, `StatCard`, `KpiMetricRow`, `Card`, `Alert`, `CollapsibleSection`, `FeatureGate`
- **Overlays** — `AppDialog`, `ConfirmDialog`, `Drawer`, `Popover`, `Tooltip`, `ContextMenu`, `AppDropdown`, `SearchableAppDropdown`, `useFloatingPanel`, `useConfirm`
- **Form controls** — `TextField`, `TextAreaField`, `SelectField`, `FormField`, `FileDropzone`, `DatePicker`, `DateRangePicker`
- **Layout** — `Page`, `PageHeader`, `Stack`, `Row`, `Cluster`, `Grid`, `Col`, `Section`, `FormLayout`, `FormActions`, `AppToolbar`
- **Navigation** — `ScopeTabs`, `SegmentedControl`
- **Data display** — `DataTable`, `Pagination`, `RowActions`, `DescriptionList`, `Timeline`, `FilterPanel`, `HubPanel`, `OperationCardGrid`, `Code`, `Text`
- **Feedback** — `ToastViewport` (presentational; no global store). Admin `ToastHost` remains the app-level queue until a later extract.
- **Theming** — `ThemeProvider`, `ThemeSwitcher`, `DensityProvider`, `useAccentColor`, `SettingsPanel`
- **i18n** — `UiStringsProvider`, `EN_UI_STRINGS`, `ES_UI_STRINGS`

Static design tokens (typography, spacing, radii) ship in `style.css`.

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

Built-in strings (aria-labels, calendar buttons, spinner, toast dismiss) default to English. Localize them once at the app root with `UiStringsProvider` — a Spanish preset ships with the package:

```tsx
import { UiStringsProvider, ES_UI_STRINGS } from '@nubitio/ui';

<UiStringsProvider strings={ES_UI_STRINGS}>
  <App />
</UiStringsProvider>;
```

Partial overrides work too (`strings={{ close: 'Schließen' }}`); missing keys fall back to English. Per-component label props (e.g. `closeLabel` on `AppDialog`/`Drawer`) win over the provider.

## License

MIT
