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
