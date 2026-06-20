import type { ReactNode } from 'react';
import type { DataGridEventNames, DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { FilterRule } from '../field/FilterRule';
import type { GridHandle } from './GridHandle';
import type { BackendAdapter } from '../adapter/BackendAdapter';
import type { SummaryItem } from '../summary';
import type { ResourceEmptyState, ResourceRowActions, ResourceToolbarItems } from '../crud/ResourceConfig';

export interface DataGridSelectionChangedEvent {
  selectedRowsData?: DataRecord[];
}

export type DataGridSummaryItem = SummaryItem;

export interface DataGridViewOptions {
  id: string;
  title: string;
  url: string;
  /** Controlled rows. When provided, the grid renders this data instead of loading from url. */
  data?: DataRecord[];
  detailUrl?: string;
  fields: Field[];
  detailFields?: Field[] | ((parentRow: DataRecord) => Field[]);
  toolbar?: ResourceToolbarItems;
  rowActions?: ResourceRowActions;
  /**
   * @deprecated Prefer onAdd/onEdit/onDelete callbacks. Events remain as a
   * legacy fallback for direct DataGridView consumers.
   */
  events?: DataGridEventNames;
  allowAdd?: boolean;
  allowEdit?: boolean;
  allowView?: boolean;
  allowDelete?: boolean;
  allowExport?: boolean;
  addDisabled?: boolean;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  /** Per-row gate for the Edit action (and row-click editing). Absent = allowed. */
  canEditRow?: (row: DataRecord) => boolean;
  /** Per-row gate for the Delete action. Absent = allowed. */
  canDeleteRow?: (row: DataRecord) => boolean;
  summaryFields?: DataGridSummaryItem[];
  /** Server-side aggregates for the current filtered collection. */
  gridSummary?: Record<string, unknown> | null;
  filter?: FilterRule[];
  sort?: Array<{ selector: string; desc: boolean }>;
  mode?: 'minimal' | 'normal' | 'full';
  paging?: boolean;
  pageSize?: number;
  hasBackButton?: boolean;
  columnsHidingEnabled?: boolean;
  stateStoringEnabled?: boolean;
  toolbarVisible?: boolean;
  selectionMode?: 'single' | 'multiple';
  /**
   * Save / revert buttons shown in the toolbar when inline edits are pending.
   * Set to `false` to hide and handle persistence via `GridHandle.saveChanges()`.
   * Defaults to `true` for `cell` and `batch` edit modes.
   */
  inlineEditToolbar?: boolean | { save?: boolean; revert?: boolean };
  /**
   * Per-row save / cancel icons in the actions column while a row is being edited.
   * Defaults to `true` for `row` mode and `false` for `cell` / `batch`.
   */
  inlineRowActions?: boolean;
  onBack?: () => void;
  onAdd?: () => void;
  onEdit?: (row: DataRecord) => void;
  onView?: (row: DataRecord) => void;
  onDelete?: (row: DataRecord) => void;
  onSelectionChanged?: (event: DataGridSelectionChangedEvent) => void;
  onRowPrepared?: (event: unknown) => void;
  onContentReady?: () => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  /** Custom batch persistence. Defaults to PATCHing each row to url/id when omitted. */
  onBatchSave?: (rows: DataRecord[]) => void | Promise<void>;
  filterRow?: boolean;
  headerFilter?: boolean;
  manualLoad?: boolean;
  beforeToolbar?: () => ReactNode;
  /** Custom content between the toolbar and the table (KPI cards, banners, filters). */
  aboveGrid?: ReactNode;
  errorMessage?: string | null;
  onDismissError?: () => void;
  editMode?: 'popup' | 'row' | 'cell' | 'batch';
  visibleColumns?: string[] | null;
  /** Custom empty state when the grid has no rows. */
  emptyState?: ResourceEmptyState;
  /** Backend adapter controlling entity key lookup and display. Defaults to HydraAdapter. */
  adapter?: BackendAdapter;
  /** Alternate row background (zebra stripes). Defaults to false. */
  zebraRows?: boolean;
}
