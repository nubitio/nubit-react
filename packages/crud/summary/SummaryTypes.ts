import type { DataRecord } from '@nubitio/core';

export type SummaryType = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'custom';

export type SummaryFormat =
  | 'currency'
  | 'fixedPoint'
  | 'decimal'
  | 'percent'
  | Intl.NumberFormatOptions
  | ((value: unknown, item: SummaryItem) => string);

export interface SummaryCalculateContext {
  rows: DataRecord[];
  column?: string;
  item: SummaryItem;
}

export interface SummaryTextContext {
  value: unknown;
  valueText: string;
  item: SummaryItem;
}

export interface SummaryItem {
  /** Field/column name used to read values and align table-based summaries. */
  column?: string;
  /** Optional label shown by table footer renderers before the computed value. */
  label?: string;
  /** Built-in aggregation or a custom calculator for reusable domain summaries. */
  summaryType?: SummaryType | ((context: SummaryCalculateContext) => unknown);
  /** Template applied after value formatting, e.g. "Total: {0}". */
  displayFormat?: string;
  /** Number format preset, Intl.NumberFormatOptions, or custom formatter. */
  valueFormat?: SummaryFormat;
  /** Final text customization hook. */
  customizeText?: (cellInfo: SummaryTextContext) => string;
  /** Decimal digits used by number presets. Defaults to 2 for currency/fixedPoint. */
  precision?: number;
  /**
   * ISO currency used by the currency preset. Defaults to the app-wide
   * `currency` from CoreConfig; with neither set, the preset falls back to
   * plain fixed-point formatting (no currency symbol).
   */
  currency?: string;
  /** Intl currency display for the currency preset. Defaults to narrowSymbol. */
  currencyDisplay?: Intl.NumberFormatOptions['currencyDisplay'];
  /** Text alignment override for renderers that are not tied to a Field. */
  align?: 'left' | 'center' | 'right';
}

export interface DetailSummaryOptions {
  items: SummaryItem[];
  /** Keeps the summary visible at the bottom of the scrollable detail table. */
  sticky?: boolean;
  /** Allows temporarily disabling summaries without changing the item list. */
  visible?: boolean;
}
