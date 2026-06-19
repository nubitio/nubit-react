export { defineResource } from './defineResource';
export { embeddedLinesUrl } from './embeddedLinesUrl';
export { CrudPage } from './CrudPage';
export { crudRoute } from './crudRoute';
export { SmartCrudPage } from './SmartCrudPage';
export { SmartCrudRolesProvider, useSmartCrudRoles } from './SmartCrudRolesContext';
export type {
  ResourceConfig,
  ResourcePermissions,
  ResourceRowActions,
  ResourceRouting,
  ResourceToolbar,
  ResourceToolbarAction,
  ResourceToolbarActionVariant,
  ResourceToolbarContext,
  ResourceToolbarItems,
  ResourceGridDetail,
  ResourceFormDetail,
  ResourceEmptyState,
} from './ResourceConfig';
export {
  defineFieldContract,
  defineFields,
  validateFieldContract,
} from './fieldContract';
export type {
  SmartCrudFieldContract,
  SmartCrudFieldOperation,
  SmartCrudFieldPatch,
  SmartCrudHydraFieldContract,
  SmartCrudHydraFieldDirective,
  SmartCrudManualField,
  SmartCrudManualFieldContract,
  SmartCrudOperation,
} from './fieldContract';
export type { FieldDef } from '../field/Field';
export type { BulkAction } from './BulkAction';
export type { FormLayout, FormTab, FormSection } from '../form/FormLayout';
export type { ColumnPreset } from './ColumnPreset';
export type { AuditTrailConfig, AuditEntry, AuditFieldLabelResolver } from './AuditTrail';
export { createAuditFieldLabelResolver } from './AuditTrail';
export { AuditTrailPanel } from './AuditTrailPanel';
export type { AuditTrailPanelProps } from './AuditTrailPanel';
export { createCrudEvents } from '@nubitio/core';
