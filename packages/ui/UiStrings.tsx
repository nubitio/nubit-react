import React, { createContext, useContext, useMemo } from 'react';

/**
 * Built-in UI strings for @nubitio/ui components (aria-labels, tooltips).
 *
 * English is the default. Localize once at the app root:
 *
 *   <UiStringsProvider strings={ES_UI_STRINGS}>...</UiStringsProvider>
 *
 * or override per key: `strings={{ close: 'Cerrar' }}`. Individual components
 * also accept label props (e.g. `closeLabel`) that win over the provider.
 */
export interface UiStrings {
  /** Generic close action (dialog/drawer close buttons). */
  close: string;
  /** Backdrop scrim of a modal dialog. */
  closeDialog: string;
  /** Backdrop scrim of a side drawer. */
  closePanel: string;
  /** DatePicker: clear the selected date. */
  clearDate: string;
  /** DateRangePicker: clear the selected range. */
  clearDateRange: string;
  /** Date pickers: open the calendar popover. */
  openCalendar: string;
  /** DatePicker: label for the date text input. */
  selectDate: string;
  /** DateRangePicker: label for the range text inputs. */
  selectDateRange: string;
  previousMonth: string;
  nextMonth: string;
  previousYear: string;
  nextYear: string;
  /** DatePicker: header button that switches to month/year selection. */
  selectMonthAndYear: string;
  /** DatePicker: header button that switches to year selection. */
  selectYear: string;
  /** Date pickers: footer button that clears the value. */
  clear: string;
  /** Date pickers: footer button that jumps to today. */
  today: string;
  /** Generic cancel action. */
  cancel: string;
  /** Generic confirm action (ConfirmDialog accept button). */
  confirm: string;
  /** DatePicker: footer button returning to the previous view. */
  back: string;
  /** DatePicker years view: previous 12-year range. */
  previousYears: string;
  /** DatePicker years view: next 12-year range. */
  nextYears: string;
  /** RowActions / table overflow menu trigger. */
  rowActions: string;
  /** Generic view action. */
  view: string;
  /** Pagination nav aria-label. */
  pages: string;
  previousPage: string;
  nextPage: string;
  // Admin shell, display settings and the HTML editor toolbar.
  settingsMenu: string;
  accentColor: string;
  accentColors: string;
  density: string;
  interfaceDensity: string;
  densityNormal: string;
  densityCompact: string;
  mainNavigation: string;
  mainMenu: string;
  closeMenu: string;
  toggleMenu: string;
  mainToolbar: string;
  mainContent: string;
  userMenu: string;
  loadingSession: string;
  textFormatting: string;
  bold: string;
  italic: string;
  strikethrough: string;
  heading2: string;
  heading3: string;
  bulletList: string;
  orderedList: string;
  blockquote: string;
  addLink: string;
  removeLink: string;
  undo: string;
  redo: string;
  /** FeatureGate: tooltip on a feature the current plan does not include. */
  featureUnavailable: string;
  /** FeatureGate upgrade prompt; `{plan}` is replaced with the plan badge. */
  featureRequiresPlan: string;
  /** FeatureGate upgrade prompt: link to the plans page. */
  viewPlans: string;
}

export const EN_UI_STRINGS: UiStrings = {
  close: 'Close',
  closeDialog: 'Close dialog',
  closePanel: 'Close panel',
  clearDate: 'Clear date',
  clearDateRange: 'Clear date range',
  openCalendar: 'Open calendar',
  selectDate: 'Select date',
  selectDateRange: 'Select date range',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  selectMonthAndYear: 'Select month and year',
  selectYear: 'Select year',
  clear: 'Clear',
  today: 'Today',
  cancel: 'Cancel',
  confirm: 'Confirm',
  back: 'Back',
  previousYears: 'Previous years',
  nextYears: 'Next years',
  rowActions: 'Actions',
  view: 'View',
  pages: 'Pages',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  settingsMenu: 'Display settings',
  accentColor: 'Accent color',
  accentColors: 'Accent colors',
  density: 'Density',
  interfaceDensity: 'Interface density',
  densityNormal: 'Normal',
  densityCompact: 'Compact',
  mainNavigation: 'Main navigation',
  mainMenu: 'Main menu',
  closeMenu: 'Close menu',
  toggleMenu: 'Toggle menu',
  mainToolbar: 'Main toolbar',
  mainContent: 'Main content',
  userMenu: 'User menu',
  loadingSession: 'Loading session',
  textFormatting: 'Text formatting',
  bold: 'Bold (Ctrl+B)',
  italic: 'Italic (Ctrl+I)',
  strikethrough: 'Strikethrough',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bulletList: 'Bullet list',
  orderedList: 'Ordered list',
  blockquote: 'Blockquote',
  addLink: 'Add link',
  removeLink: 'Remove link',
  undo: 'Undo (Ctrl+Z)',
  redo: 'Redo (Ctrl+Y)',
  featureUnavailable: 'This feature is not available on your current plan.',
  featureRequiresPlan: 'This feature requires the {plan} plan. Upgrade your plan to unlock it.',
  viewPlans: 'View plans',
};

export const ES_UI_STRINGS: UiStrings = {
  close: 'Cerrar',
  closeDialog: 'Cerrar diálogo',
  closePanel: 'Cerrar panel',
  clearDate: 'Limpiar fecha',
  clearDateRange: 'Limpiar rango',
  openCalendar: 'Abrir calendario',
  selectDate: 'Seleccionar fecha',
  selectDateRange: 'Seleccionar rango de fechas',
  previousMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  previousYear: 'Año anterior',
  nextYear: 'Año siguiente',
  selectMonthAndYear: 'Seleccionar mes y año',
  selectYear: 'Seleccionar año',
  clear: 'Limpiar',
  today: 'Hoy',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  back: 'Volver',
  previousYears: 'Años anteriores',
  nextYears: 'Años siguientes',
  rowActions: 'Acciones',
  view: 'Ver',
  pages: 'Páginas',
  previousPage: 'Página anterior',
  nextPage: 'Página siguiente',
  settingsMenu: 'Ajustes de visualización',
  accentColor: 'Color de acento',
  accentColors: 'Colores de acento',
  density: 'Densidad',
  interfaceDensity: 'Densidad de interfaz',
  densityNormal: 'Normal',
  densityCompact: 'Compacta',
  mainNavigation: 'Navegación principal',
  mainMenu: 'Menú principal',
  closeMenu: 'Cerrar menú',
  toggleMenu: 'Alternar menú',
  mainToolbar: 'Barra de herramientas principal',
  mainContent: 'Contenido principal',
  userMenu: 'Menú de usuario',
  loadingSession: 'Cargando sesión',
  textFormatting: 'Formato de texto',
  bold: 'Negrita (Ctrl+B)',
  italic: 'Cursiva (Ctrl+I)',
  strikethrough: 'Tachado',
  heading2: 'Título 2',
  heading3: 'Título 3',
  bulletList: 'Lista con viñetas',
  orderedList: 'Lista numerada',
  blockquote: 'Cita',
  addLink: 'Añadir enlace',
  removeLink: 'Quitar enlace',
  undo: 'Deshacer (Ctrl+Z)',
  redo: 'Rehacer (Ctrl+Y)',
  featureUnavailable: 'Esta función no está disponible en tu plan actual.',
  featureRequiresPlan:
    'Esta función requiere el plan {plan}. Actualiza tu plan para desbloquearla.',
  viewPlans: 'Ver planes',
};

const UiStringsContext = createContext<UiStrings>(EN_UI_STRINGS);

export interface UiStringsProviderProps {
  /** Full or partial string set; missing keys fall back to English. */
  strings: Partial<UiStrings>;
  children: React.ReactNode;
}

export const UiStringsProvider: React.FC<UiStringsProviderProps> = ({ strings, children }) => {
  const value = useMemo(() => ({ ...EN_UI_STRINGS, ...strings }), [strings]);
  return <UiStringsContext.Provider value={value}>{children}</UiStringsContext.Provider>;
};

export const useUiStrings = (): UiStrings => useContext(UiStringsContext);
