import type { RefObject } from 'react';
import type { Field, FieldDef } from '../field/Field';
import type { FieldInput } from '../field/buildFields';
import type { FilterRule } from '../field/FilterRule';
import type { DataRecord, FormEventNames } from '@nubitio/core';
import type { FormHandle } from '../form/FormHandle';
import type { GridHandle } from '../datagrid/GridHandle';
import type { FormLayout } from '../form/FormLayout';
import type { BulkAction } from './BulkAction';
import type { ColumnPreset } from './ColumnPreset';
import type { AuditTrailConfig } from './AuditTrail';
import type { SmartCrudFieldContract } from './fieldContract';
import type { BackendAdapter } from '../adapter/BackendAdapter';
import type { CrudDrawerSize } from '../view/drawerSizes';
import type { DetailSummaryOptions, SummaryItem } from '../summary';

/**
 * URL-based deep-linking and filter sync configuration for SmartCrudPage.
 * All fields are optional — if `routing` is absent, no URL behaviour is applied.
 */
export interface ResourceRouting {
  /**
   * URL param name for deep-linking a specific record.
   * e.g. `routeParam: 'id'` →  `/products/42`  opens record 42 in the edit dialog
   *                          →  `/products/new`  opens the add dialog
   */
  routeParam?: string;

  /**
   * When true, grid filter state is synced to URL query params.
   * e.g. `?name=foo&status=active`
   */
  syncFiltersToUrl?: boolean;
}

/** Raw permission spec: each entry may be a static boolean or a zero-arg callable. */
export interface ResourcePermissions {
  canAdd?: boolean | (() => boolean);
  canEdit?: boolean | (() => boolean);
  canView?: boolean | (() => boolean);
  canDelete?: boolean | (() => boolean);
  canExport?: boolean | (() => boolean);
  canBulkDelete?: boolean | (() => boolean);
  /**
   * Per-row gate for editing: rows where this returns false hide the Edit
   * action and open read-only (View) on row click. Use it to lock records
   * that are immutable by domain rule (issued documents, closed periods, …).
   */
  canEditRow?: (row: DataRecord) => boolean;
  /** Per-row gate for the Delete action. */
  canDeleteRow?: (row: DataRecord) => boolean;
}

export type ResourceToolbarActionVariant = string;

export interface ResourceToolbarAction {
  key?: string;
  text: string;
  icon?: string;
  hint?: string;
  type?: ResourceToolbarActionVariant;
  group?: string;
  groupLabel?: string;
  permission?: string;
  visible?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export type ResourceRowActions<T extends DataRecord = DataRecord> =
  | ResourceToolbarAction[]
  | ((row: T) => ResourceToolbarAction[]);

export interface ResourceToolbarItems {
  primary?: ResourceToolbarAction[];
  selection?: ResourceToolbarAction[];
  utility?: ResourceToolbarAction[];
  showRefresh?: boolean;
}

export interface ResourceToolbarContext<T extends DataRecord = DataRecord> {
  resource: ResourceConfig<T>;
  selectedRow: T | undefined;
  selectedRows: T[];
  gridRef: RefObject<GridHandle | null>;
  formRef: RefObject<FormHandle | null>;
  events: FormEventNames;
  emit: <P>(name: string, payload?: P) => void;
}

export type ResourceToolbar<T extends DataRecord = DataRecord> =
  | ResourceToolbarItems
  | ((context: ResourceToolbarContext<T>) => ResourceToolbarItems);

export interface ResourceGridDetail {
  url: string;
  /** Built Fields or builder instances — `.build()` is called for you. */
  fields: FieldInput[] | ((parentRow: DataRecord) => FieldInput[]);
}

export interface ResourceFormDetail {
  /**
   * Source for existing detail rows when editing. Must contain an `{id}`
   * placeholder replaced with the parent record id, e.g.
   * `/api/sales-document-lines?document={id}`. Without it the edit form
   * cannot reload rows and shows an empty detail grid.
   */
  url?: string;
  /** Footer summary for the detail grid (e.g. sum of line totals). */
  summary?: DetailSummaryOptions;
  /** Built Fields or builder instances — `.build()` is called for you. */
  fields: FieldInput[];
  propertyName?: string;
  allowAdding?: boolean;
  allowDeleting?: boolean;
  allowUpdating?: boolean;
  required?: boolean;
}

/**
 * Where the create/edit form is rendered.
 *
 * - `'dialog'` (default) — modal centred over the grid. Best for short forms.
 * - `'drawer'` — slide-in panel from the right (full-screen sheet on mobile).
 *   Grid stays visible — user can reference other rows while editing.
 * - `'page'`   — full route. The grid is replaced by the form; Save/Cancel
 *   navigate back to the list URL. Requires the route to accept `:id?`.
 *   Use the `crudRoute()` helper to wire `/<resource>` and `/<resource>/:id?`
 *   in one call.
 */
export type CrudViewMode = 'dialog' | 'drawer' | 'page';

export interface CrudViewModeConfig {
  mode: CrudViewMode;
  /**
   * Drawer size token — maps to a library width preset (`sm` 480, `md` 640,
   * `lg` 880, `xl` 1120). Ignored when `drawerWidth` is set.
   */
  drawerSize?: CrudDrawerSize;
  /** Explicit drawer width override. Takes priority over `drawerSize`. */
  drawerWidth?: number | string;
  /** Side the drawer slides in from. Default: `'right'`. */
  drawerSide?: 'right' | 'left';
}

/** Contextual empty state shown when the grid has no rows. */
export interface ResourceEmptyState {
  title?: string;
  description?: string;
  /** Phosphor icon name without the "ph-" prefix. */
  icon?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success';
}

export interface ResourceConfig<T extends DataRecord = DataRecord> {
  id: string;
  title: string;
  apiUrl: string;
  /**
   * Backend adapter that controls how the engine interacts with the API.
   * - `HydraAdapter` (default) — API Platform / JSON-LD + Hydra backends.
   * - `RestAdapter` — plain OpenAPI / REST backends with numeric or UUID ids.
   * - Provide a custom implementation for any other convention.
   */
  adapter?: BackendAdapter;
  /**
   * Manual field definitions for this resource.
   * Omit (or pass an empty array) to let SmartCrudPage auto-infer fields from
   * the Hydra/OpenAPI schema. Prefer `fieldContract` for augmenting inferred fields.
   */
  fields?: FieldInput[] | FieldDef<T>[];
  /**
   * Form-only field definitions. When set, the grid uses `fields` and the
   * create/edit form uses `formFields` — avoids re-fetching the grid on every
   * reactive form rule evaluation (e.g. visibleWhen while typing).
   */
  formFields?: FieldInput[];
  /**
   * Canonical production field contract for SmartCrud.
   * SmartCrud runtime treats this as authoritative over legacy
   * `fields` + `fieldOverrides` combinations whenever it is present.
   */
  fieldContract?: SmartCrudFieldContract<T>;
  /**
   * @deprecated Prefer callback/state coordination. This remains only as a legacy
   * escape hatch for code that still listens to CRUD event names directly.
   */
  events?: FormEventNames;
  /** Detail rows rendered in the main grid's expandable row panel. */
  gridDetail?: ResourceGridDetail;
  /** Detail rows rendered inside the create/edit form. */
  formDetail?: ResourceFormDetail;
  sort?: Array<{ selector: string; desc: boolean }>;
  filter?: FilterRule[];
  mode?: 'normal' | 'minimal';
  paging?: boolean;
  /** Enables adapter-provided header filter dropdowns. Disabled by default; filter row remains the default. */
  headerFilter?: boolean;
  stateStoring?: boolean;
  /** Fine-grained RBAC permission overrides. May be static or a callable that is
   *  evaluated at render time. */
  permissions?: ResourcePermissions;
  dialogWidth?: number;
  dialogHeight?: number;
  /**
   * Where the create/edit form is rendered. Defaults to `'dialog'`.
   *
   * Examples:
   *   viewMode: 'drawer'
   *   viewMode: { mode: 'drawer', drawerSize: 'lg' }
   *   viewMode: 'page'
   */
  viewMode?: CrudViewMode | CrudViewModeConfig;
  format?: 'json' | 'multipart';
  toolbar?: ResourceToolbar<T>;
  rowActions?: ResourceRowActions<T>;
  onSaveSuccess?: (response: T) => void;
  onSaveError?: (error?: unknown) => void;
  onDeleteSuccess?: (response: T) => void;
  onDeleteError?: (error?: unknown) => void;
  /**
   * Footer summaries for the main grid, aligned to their `column`. Computed
   * client-side over the **loaded page**, not the full filtered dataset.
   * e.g. `[{ column: 'total', summaryType: 'sum', valueFormat: 'currency' }]`
   */
  summaryFields?: SummaryItem[];
  /** Bulk actions rendered in the bulk toolbar when rows are selected. */
  bulkActions?: BulkAction[];
  /**
   * Grid editing mode. Inline modes are interpreted by the active grid adapter.
   * - `'popup'` (default) opens the resource dialog and form.
   * - `'row'` | `'cell'` | `'batch'` enable inline editing when supported.
   */
  editMode?: 'popup' | 'row' | 'cell' | 'batch';
  /** Optional layout descriptor for the dialog form: tabs or collapsible sections. */
  formLayout?: FormLayout;
  /** Named column visibility presets. When defined, a preset selector is shown in the toolbar. */
  columnPresets?: ColumnPreset[];
  /** Key of the preset to activate by default (overridden by any localStorage value). */
  defaultPreset?: string;
  /** Custom empty state when the grid has no rows. Falls back to the generic no-records message. */
  emptyState?: ResourceEmptyState;
  /** Optional audit trail configuration. When enabled, shows a "Historial" button and panel. */
  auditTrail?: AuditTrailConfig;
  /** Optional URL routing configuration — enables deep-linking and filter sync. */
  routing?: ResourceRouting;
  /**
   * Called whenever a detail-grid row is added, updated, or removed.
   * Use this to recompute header-form fields that depend on detail data
   * (e.g., recalculating a `total` field from line items).
   *
   * @param formRef - ref to the form handle (call `formRef.current?.setFieldValue(...)` etc.)
   */
  onDetailRowsChanged?: (formRef: RefObject<FormHandle | null>) => void;
  /**
   * Enable or disable real-time Mercure subscription for this resource.
   *
   * - `true` (default): `SmartCrudPage` opens an SSE subscription to the Mercure hub
   *   and refreshes the grid automatically when another session modifies the resource.
   * - `false`: disables the Mercure subscription for this resource. The grid still
   *   refreshes via the existing RxJS event bus for operations in the same session.
   *
   * Has no effect if the Mercure hub URL has not been discovered (graceful degradation).
   */
  mercure?: boolean;
  /**
   * Internal: HTTP methods inferred from `hydra:supportedOperation` in the API doc.
   * Populated automatically by SmartCrudPage from useResourceSchema.
   * Do NOT set this manually — it is overridden by any explicit `allowX` / `permissions` config.
   * e.g. ['GET', 'POST', 'PATCH', 'DELETE']
   */
  _supportedOperations?: string[];
}
