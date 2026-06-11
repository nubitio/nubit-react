import type { FormLayout } from './FormLayout';
import type { FormPresentationContext } from './resolveFieldColSpan';
import type { FormEventNames } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { FormDataChangedHandler, FormDataRecord, FormDataSnapshot } from './FormDataSnapshot';
import type { BackendAdapter } from '../adapter/BackendAdapter';
import type { DetailSummaryOptions } from '../summary';

export interface FormViewOptions {
  className?: string;
  url: string;
  detailUrl?: string;
  fields: Field[];
  detailFields?: Field[];
  /** Optional summary footer for master-detail line tables. */
  detailSummary?: DetailSummaryOptions;
  detailPropertyName?: string;
  allowAdding?: boolean;
  allowUpdating?: boolean;
  allowDeleting?: boolean;
  /**
   * @deprecated Prefer operation/rowData plus the imperative FormHandle save/deleteRow methods.
   * Events remain as a legacy fallback for direct FormView consumers.
   */
  events?: FormEventNames;
  editable?: boolean;
  format?: 'json' | 'multipart';
  requiredDetail?: boolean;
  /** Backend adapter controlling entity serialization and URL building. Defaults to HydraAdapter. */
  adapter?: BackendAdapter;
  /** Called after a successful POST or PATCH. Receives the server response. */
  onSaveSuccess?: (response: unknown) => void;
  /** Called when POST or PATCH fails after HTTP error handling. */
  onSaveError?: (error?: unknown) => void;
  /** Called after a successful DELETE. */
  onDeleteSuccess?: (response: unknown) => void;
  /** Called when DELETE fails. */
  onDeleteError?: (error?: unknown) => void;
  /** Called whenever the loading state changes. */
  onLoadingChange?: (loading: boolean) => void;
  /** Optional layout descriptor for tabs or collapsible sections. */
  formLayout?: FormLayout;
  /** Presentation context used by auto column-span resolution. */
  presentationContext?: FormPresentationContext;
  /** Called whenever any form field value changes with a full form data snapshot. */
  onFieldDataChanged?: FormDataChangedHandler;
  /** Latest runtime-computed values pushed down by SmartCrudPage. */
  computedValues?: FormDataSnapshot;
  /** Callback/state-driven operation. When set, replaces ADD/EDIT event bootstrapping. */
  operation?: 'add' | 'edit' | null;
  /** Row payload used when operation changes. */
  rowData?: FormDataRecord | null;
  /** Increment to force re-applying the current operation and row payload. */
  operationVersion?: number;
}
