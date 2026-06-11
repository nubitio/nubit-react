# @nubit/ui

Visual primitives and theme system for the Nubit admin stack: buttons, dialogs, drawers, cards, form controls, date pickers, badges, and a light/dark theme with density and accent-color support.

## Install

```bash
npm install @nubit/ui
```

## Peer dependencies

```json
"react": "^19",
"react-dom": "^19"
```

## Usage

```tsx
import { ThemeProvider, Button, AppDialog, Card } from '@nubit/ui';
import '@nubit/ui/style.css';

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

All components ship their styles in `dist/style.css`; import it once at the app root. Static design tokens (typography, spacing, radii) are included in `style.css`.

## Theming

Color/surface tokens live in runtime-switchable theme stylesheets shipped with the package (`@nubit/ui/themes/nb-theme-light.css` and `nb-theme-dark.css`). `ThemeProvider` loads them from `basePath` (default `/themes/`) and toggles a `data-theme` attribute plus a `nb-theme-{light,dark}` class on `<html>` — copy the two theme files into your public directory (or point `basePath` wherever you serve them):

```tsx
import { ThemeProvider, ThemeSwitcher } from '@nubit/ui';

<ThemeProvider basePath="/themes/">
  <App />
</ThemeProvider>;
```

`storageKey` (default `nb-theme`) and `themePrefix` (default `nb-theme-`) are configurable.

## Localization

Built-in strings (aria-labels, calendar buttons) default to English. Localize them once at the app root with `UiStringsProvider` — a Spanish preset ships with the package:

```tsx
import { UiStringsProvider, ES_UI_STRINGS } from '@nubit/ui';

<UiStringsProvider strings={ES_UI_STRINGS}>
  <App />
</UiStringsProvider>;
```

Partial overrides work too (`strings={{ close: 'Schließen' }}`); missing keys fall back to English. Per-component label props (e.g. `closeLabel` on `AppDialog`/`Drawer`) win over the provider.

## License

MIT
