/**
 * @nubitio/crud — CRUD engine, field DSL, form/grid views.
 *
 * Core entry point for building admin CRUD pages against any REST or Hydra backend.
 *
 * Quick start:
 *   const resource = defineResource('/api/products', { title: 'Products' });
 *   export const ProductPage = () => <SmartCrudPage resource={resource} />;
 *
 * defineResource(apiUrl, overrides?) is the only call form — the legacy object overload is gone.
 */

// ── CRUD engine ───────────────────────────────────────────────────────────────
export {
  CrudPage,
  crudRoute,
  SmartCrudPage,
  SmartCrudRolesProvider,
  useSmartCrudRoles,
  defineFieldContract,
  defineFields,
  defineResource,
  embeddedLinesUrl,
  validateFieldContract,
  createCrudEvents,
  AuditTrailPanel,
} from './crud';
export type {
  AuditEntry,
  AuditTrailConfig,
  AuditFieldLabelResolver,
  AuditTrailPanelProps,
  BulkAction,
  ColumnPreset,
  FormLayout,
  FormSection,
  FormTab,
  ResourceConfig,
  ResourceFormDetail,
  ResourceGridDetail,
  ResourcePermissions,
  ResourceRowActions,
  ResourceRouting,
  ResourceEmptyState,
  ResourceToolbar,
  ResourceToolbarAction,
  ResourceToolbarActionVariant,
  ResourceToolbarContext,
  ResourceToolbarItems,
  CrudGridSlotContext,
  SmartCrudFieldContract,
  SmartCrudFieldOperation,
  SmartCrudFieldPatch,
  SmartCrudHydraFieldContract,
  SmartCrudHydraFieldDirective,
  SmartCrudManualField,
  SmartCrudManualFieldContract,
  SmartCrudOperation,
} from './crud';

// ── Field DSL ─────────────────────────────────────────────────────────────────
export {
  currencyField,
  dateField,
  datetimeField,
  entityField,
  enumField,
  checkboxField,
  identityField,
  fileField,
  imageField,
  noneField,
  numberField,
  passwordField,
  selectField,
  switchField,
  textField,
  textareaField,
} from './field/FieldBuilders';
export type { EnumOption } from './field/FieldBuilders';
export { buildFields } from './field/buildFields';
export type { FieldInput } from './field/buildFields';
export { FieldBuilder } from './field/FieldBuilder';
export { FieldType } from './field/FieldType';
export type { Field, FieldDef, LoadOption } from './field/Field';
export type {
  FormatterFn,
  FormOnChangeFn,
  GridCellContext,
  GridOnChangeFn,
  ItemFormatterFn,
  OnChangeFn,
} from './field/FieldCallbacks';
export type { FilterRule } from './field/FilterRule';
export type { ValidationRule } from './field/ValidationRule';

// ── Views ─────────────────────────────────────────────────────────────────────
export { DataGridView, DATA_GRID_EVENTS } from './datagrid/DataGridView';
export { DialogView } from './dialog/DialogView';
export { DrawerView } from './view/DrawerView';
export type { CrudDrawerViewEvents, CrudDrawerViewOptions } from './view/CrudDrawerView';
export { PageView } from './view/PageView';
export type { CrudPageViewEvents, CrudPageViewOptions } from './view/CrudPageView';
export { FormView, FORM_EVENTS } from './form/FormView';
export { EntityDropdown } from './form/EntityDropdown';
export type { EntityDropdownProps } from './form/EntityDropdown';
export {
  CrudFormShell,
  CrudDialogShell,
  CrudDrawerShell,
  CrudPageShell,
  resolveViewMode,
} from './view';
export type { CrudFormShellProps } from './view';
export type { ResolvedViewMode, CrudDrawerSize } from './view';
export {
  DRAWER_WIDTHS,
  DEFAULT_DRAWER_SIZE,
  DEFAULT_DRAWER_WIDTH,
  resolveDrawerWidth,
  resolveDrawerLayoutBucket,
  parseDrawerWidthPx,
} from './view';
export type { CrudViewMode, CrudViewModeConfig } from './crud/ResourceConfig';
export { ToolbarSelect } from './crud/ToolbarSelect';
export type { ToolbarSelectOption, ToolbarSelectProps } from './crud/ToolbarSelect';
export { ColumnPresetSelector } from './crud/ColumnPresetSelector';
export { useColumnPreset } from './crud/useColumnPreset';
export type { ColumnPresetState } from './crud/useColumnPreset';

// ── Handles & options ─────────────────────────────────────────────────────────
export type { FormHandle } from './form/FormHandle';
export type { FormViewOptions } from './form/FormViewOptions';
export {
  buildFieldColSpanContext,
  isLongTextField,
  isShortField,
  resolveDrawerSize,
  resolveFieldColSpan,
  resolveFieldsColSpans,
} from './form/resolveFieldColSpan';
export type {
  ColSpan,
  DrawerSize,
  FieldColSpanContext,
  FormLayoutHint,
  FormPresentationContext,
  FormPresentationMode,
} from './form/resolveFieldColSpan';
export type { GridHandle } from './datagrid/GridHandle';
export type {
  DataGridSelectionChangedEvent,
  DataGridSummaryItem,
  DataGridViewOptions,
} from './datagrid/DataGridViewOptions';
export type { ColumnGroupDef, ColumnHeaderCell, ResolvedColumnHeaders } from './datagrid/ColumnGroup';
export {
  buildGroupBoundaryClassName,
  resolveColumnHeaders,
  resolveFieldGroupClassName,
  resolveFieldGroupBoundaries,
} from './datagrid/resolveColumnHeaders';
export type { FieldGroupBoundary } from './datagrid/resolveColumnHeaders';
export type {
  DetailSummaryOptions,
  SummaryCalculateContext,
  SummaryFormat,
  SummaryItem,
  SummaryTextContext,
  SummaryType,
} from './summary';
export { computeSummaryValue, formatSummaryValue, resolveSummaryText } from './summary';
export { buildWorkflowRowActions } from './workflow/buildWorkflowRowActions';

// ── Backend adapters ──────────────────────────────────────────────────────────
export type { BackendAdapter } from './adapter/BackendAdapter';
export { HydraAdapter } from './adapter/HydraAdapter';
export { RestAdapter } from './adapter/RestAdapter';

// ── Extension points (for @nubitio/hydra and adapter implementors) ──────────────
export { ResourceSchemaProvider } from './schema/ResourceSchema';
export type {
  ResourceSchemaProviderProps,
  ResourceSchemaResolution,
  ResourceSchemaResolver,
} from './schema/ResourceSchema';
export { ResourceStoreProvider } from './data/ResourceStore';
export { createRestResourceStore } from './data/restResourceStore';
export type { RestQueryDialect } from './data/restResourceStore';
export type { FieldOverride } from './crud/resolveSmartCrudFields';
export { useResourceStoreFactory } from './data/ResourceStore';
export type {
  ResourceFilterDescriptor,
  ResourceFilterRule,
  ResourceLoadOption,
  ResourceLoadOptions,
  ResourceSortDescriptor,
  ResourceStore,
  ResourceStoreFactory,
  ResourceStoreOptions,
  ResourceStoreProviderProps,
} from './data/ResourceStore';

// ── Base data types (convenience re-exports from @nubitio/core) ─────────────────
export type { DataRecord } from '@nubitio/core';
export type { GridData } from '@nubitio/core';
