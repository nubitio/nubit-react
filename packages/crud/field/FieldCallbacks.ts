import React from 'react';
import type { DataRecord } from '@nubitio/core';

export interface GridCellContext<
  TData extends DataRecord = DataRecord,
  TValue = unknown,
> {
  value?: TValue;
  data: TData;
  rowIndex?: number;
  columnIndex?: number;
  [key: string]: unknown;
}

/**
 * Callback for grid column cell rendering.
 * Receives the app-owned cell context; UI adapters may provide extra fields.
 *
 * Pass a TData type argument to get typed access to cell.data:
 *   FormatterFn<InvoiceRecord>
 *   (cell: GridCellContext<InvoiceRecord>) => cell.data.customer?.ruc
 */
export type FormatterFn<TData extends DataRecord = DataRecord> = (
  cell: GridCellContext<TData>,
) => React.ReactNode;

/**
 * Callback for grid column `setCellValue` — called when the user edits a cell in an
 * inline grid editor. The active grid adapter passes three arguments:
 *   - `newData`       – partial row data object to mutate with the new value
 *   - `value`         – the new cell value
 *   - `currentRowData`– the full row data before the edit
 *
 * @example
 *   .onChange(function(row, value, currentRow) { row.total = value * currentRow.qty; })
 */
export type GridOnChangeFn = (
  newData: DataRecord,
  value: unknown,
  currentRowData: DataRecord,
) => void | Promise<void>;

/**
 * Callback for form field `onValueChanged` — called when the user changes a form
 * field value. The form infrastructure unwraps adapter events and passes the raw value directly.
 *
 * @example
 *   .onChange(value => { selectedWarehouseId = value as number; })
 */
export type FormOnChangeFn = (value: unknown) => void | Promise<void>;

/** Union accepted by `.onChange()` — covers both grid and form contexts. */
export type OnChangeFn = GridOnChangeFn | FormOnChangeFn;

/**
 * Callback for `itemRender` in dropdown/select editors — renders a single list item.
 *
 * @example
 *   .itemFormatter(item => `${item.code} – ${item.name}`)
 */
export type ItemFormatterFn = (item: unknown) => React.ReactNode;
