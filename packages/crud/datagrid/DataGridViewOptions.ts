import type { ReactNode } from 'react';
import type { DataGridEventNames, DataRecord } from '@nubit/core';
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
  summaryFields?: DataGridSummaryItem[];
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
  inlineActions?: boolean;
  onBack?: () => void;
  onAdd?: () => void;
  onEdit?: (row: DataRecord) => void;
  onView?: (row: DataRecord) => void;
  onDelete?: (row: DataRecord) => void;
  onSelectionChanged?: (event: DataGridSelectionChangedEvent) => void;
  onRowPrepared?: (event: unknown) => void;
  onContentReady?: () => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  filterRow?: boolean;
  headerFilter?: boolean;
  manualLoad?: boolean;
  beforeToolbar?: () => ReactNode;
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
