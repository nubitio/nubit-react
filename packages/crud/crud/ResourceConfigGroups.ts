import type { AuditTrailConfig } from './AuditTrail';
import type { ColumnPreset } from './ColumnPreset';
import type { ColumnGroupDef } from '../datagrid/ColumnGroup';
import type { FormLayout } from '../form/FormLayout';
import type { SummaryItem } from '../summary';
import type {
  CrudViewMode,
  CrudViewModeConfig,
  ResourceEmptyState,
  ResourceFormDetail,
  ResourceGridDetail,
  ResourcePermissions,
  ResourceRouting,
} from './ResourceConfig';

/** Grouped, additive resource config — flattened by {@link flattenResourceGroups}. */
export interface ResourceDisplayGroup {
  title?: string;
  viewMode?: CrudViewMode | CrudViewModeConfig;
  emptyState?: ResourceEmptyState;
}

export interface ResourceAccessGroup {
  permissions?: ResourcePermissions;
  auditTrail?: AuditTrailConfig;
}

export interface ResourceFormGroup {
  layout?: FormLayout;
  detail?: ResourceFormDetail;
}

export interface ResourceGridGroup {
  detail?: ResourceGridDetail;
  summaryFields?: SummaryItem[];
  columnPresets?: ColumnPreset[];
  columnGroupDefs?: ColumnGroupDef[];
  defaultPreset?: string;
}

export interface ResourceConfigGroups {
  display?: ResourceDisplayGroup;
  access?: ResourceAccessGroup;
  form?: ResourceFormGroup;
  grid?: ResourceGridGroup;
  routing?: ResourceRouting;
}

/** Flattens grouped config into top-level {@link ResourceConfig} props. */
export function flattenResourceGroups(groups: ResourceConfigGroups): Record<string, unknown> {
  return {
    ...(groups.display?.title !== undefined ? { title: groups.display.title } : {}),
    ...(groups.display?.viewMode !== undefined ? { viewMode: groups.display.viewMode } : {}),
    ...(groups.display?.emptyState !== undefined ? { emptyState: groups.display.emptyState } : {}),
    ...(groups.access?.permissions !== undefined ? { permissions: groups.access.permissions } : {}),
    ...(groups.access?.auditTrail !== undefined ? { auditTrail: groups.access.auditTrail } : {}),
    ...(groups.form?.layout !== undefined ? { formLayout: groups.form.layout } : {}),
    ...(groups.form?.detail !== undefined ? { formDetail: groups.form.detail } : {}),
    ...(groups.grid?.detail !== undefined ? { gridDetail: groups.grid.detail } : {}),
    ...(groups.grid?.summaryFields !== undefined ? { summaryFields: groups.grid.summaryFields } : {}),
    ...(groups.grid?.columnPresets !== undefined ? { columnPresets: groups.grid.columnPresets } : {}),
    ...(groups.grid?.columnGroupDefs !== undefined ? { columnGroupDefs: groups.grid.columnGroupDefs } : {}),
    ...(groups.grid?.defaultPreset !== undefined ? { defaultPreset: groups.grid.defaultPreset } : {}),
    ...(groups.routing !== undefined ? { routing: groups.routing } : {}),
  };
}