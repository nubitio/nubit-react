import type React from 'react';
import type { CoreHttpClient, CoreTranslationKeys, DataRecord } from '@nubitio/core';
import type { Field } from '../Field';
import type { BackendAdapter } from '../../adapter/BackendAdapter';
import type { FormDataRecord } from '../../form/FormDataSnapshot';
import type { UploadedFile } from '../../form/UploadedFile';

/** One grid filter operator choice (wire value + compact display label). */
export type FilterOperator = { value: string; label: string };

export interface CellTextContext {
  /** Pre-loaded options for ENTITY fields (IRI → display text lookup). */
  entityOptions?: DataRecord[];
  yesLabel: string;
  noLabel: string;
}

/**
 * Outcome of serializing one form value:
 * - `set` writes `value` under the field name (creating the key if absent),
 * - `omit` removes the key from the payload,
 * - `keep` leaves whatever the form currently holds untouched.
 */
export type SerializedFieldValue =
  | { kind: 'set'; value: unknown }
  | { kind: 'omit' }
  | { kind: 'keep' };

/**
 * Semantic control category of a type's form editor. View backends that do
 * not render `ControlRender` directly (e.g. DevExtreme) map this to their own
 * widget set instead of switching on `field.type`.
 */
export type FieldControlKind =
  | 'text'
  | 'password'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'radio'
  | 'switch'
  | 'checkbox'
  | 'file'
  | 'tags'
  | 'html'
  | 'none';

/**
 * Width class the form col-span heuristics assign to a type's control:
 * `full` always spans the row, `compact` fits a half column, `auto` leaves
 * the decision to the layout context.
 */
export type FieldFormWidth = 'full' | 'compact' | 'auto';

export interface NormalizeFieldContext {
  /** Backend adapter controlling entity-value normalization. */
  adapter: BackendAdapter;
  /** Registers an entity option so the selected item displays even when absent from the loaded page. */
  prependEntityOption(field: Field, item: FormDataRecord): void;
  /** Options previously registered for the field (including via prependEntityOption). */
  getPrependData(field: Field): FormDataRecord[] | undefined;
}

export interface SerializeFieldContext {
  /** Backend adapter controlling entity-reference serialization. */
  adapter: BackendAdapter;
  /** Submission format; affects how FILE fields are handled. */
  format?: 'json' | 'multipart';
  /** Imperative accessor for raw control values (FILE fields in multipart mode). */
  getFieldValue?: (field: string) => unknown;
}

export type FieldTranslator = (key: keyof CoreTranslationKeys, options?: DataRecord) => string;

/** The standard attribute set the form applies to plain HTML controls. */
export interface FieldControlCommonProps {
  className: string;
  disabled: boolean | undefined;
  id: string;
  name: string;
  onClick: ((e: unknown) => void) | undefined;
  readOnly: boolean;
  required: boolean;
}

/** Form-level services a control may need, supplied once by the form view. */
export interface FormControlContext {
  httpClient: CoreHttpClient;
  t: FieldTranslator;
  /** Remotely loaded options per field name (ENTITY/TAGS). */
  remoteOptions: Record<string, DataRecord[]>;
  getPrependData(fieldName: string): FormDataRecord[] | undefined;
  /** Imperative form value accessor (field buttons, FILE multipart). */
  getFieldValue(name: string): unknown;
  getExistingMedia(fieldName: string): FormDataRecord | null;
  clearExistingMedia(fieldName: string): void;
  upsertUploadedFile(entry: UploadedFile): void;
}

/** Everything a grid filter-cell editor needs, supplied by the filter row. */
export interface FilterCellProps {
  field: Field;
  operator: string;
  value: string;
  /** Pre-loaded options for ENTITY filter lookups. */
  remoteOptions: DataRecord[];
  httpClient: CoreHttpClient;
  t: FieldTranslator;
  onClear(): void;
  onInputChange(value: string): void;
  onBetweenInputChange(start: string, end: string): void;
  onSelectChange(value: string): void;
  onOperatorChange(operator: string): void;
}

/** Everything an inline detail-grid cell editor needs, supplied by the detail grid. */
export interface DetailCellProps {
  field: Field;
  value: unknown;
  /** ' is-error' when the cell has a validation error, '' otherwise. */
  errorClass: string;
  allowUpdating: boolean;
  httpClient: CoreHttpClient;
  remoteOptions: Record<string, DataRecord[]>;
  getPrependData(fieldName: string): FormDataRecord[] | undefined;
  onChange(value: unknown): void;
}

export interface FieldControlProps {
  field: Field;
  value: unknown;
  error: string | undefined;
  /** ' is-error' when the field has a validation error, '' otherwise. */
  errorClass: string;
  disabled: boolean | undefined;
  readOnly: boolean;
  commonProps: FieldControlCommonProps;
  setFieldValue(name: string, value: unknown): void;
  ctx: FormControlContext;
}

/**
 * A Field-Type module: all behaviour for one FieldType behind one interface
 * (see CONTEXT.md). The grid, form and serializers look modules up in the
 * Field-Type registry instead of switching on `field.type`.
 */
export interface FieldTypeModule {
  /** Semantic control category for adapter view backends; treated as 'text' when omitted. */
  controlKind?: FieldControlKind;
  /** Width class for the form col-span heuristics; treated as 'auto' when omitted. */
  formWidth?(field: Field): FieldFormWidth;
  /**
   * Normalizes one raw API value into the shape the form editors expect
   * (see `normalizeFormData`). When omitted, object/array values are
   * stripped from the row and scalars pass through untouched.
   */
  normalizeFormValue?(field: Field, value: unknown, ctx: NormalizeFieldContext): SerializedFieldValue;
  /** Per-type detail-row validation beyond the generic required-empty check; valid when omitted. */
  validateDetailValue?(field: Field, value: unknown): boolean;
  /** Operator preselected in the grid filter row (a Field's own `selectedFilterOperation` wins). */
  defaultFilterOperator: string;
  /** Operators offered for this type in the grid filter row. */
  filterOperators: FilterOperator[];
  /** Expands one filter-row entry into ResourceStore filter terms. */
  buildFilterTerms(field: Field, operator: string, value: string): unknown[][];
  /** Plain-text representation of a row value for grid cells and tooltips. */
  cellText(field: Field, value: unknown, ctx: CellTextContext): string;
  /** Transforms a raw main-form value into its wire format. */
  serializeFormValue(field: Field, value: unknown, ctx: SerializeFieldContext): SerializedFieldValue;
  /** Transforms a raw detail-grid cell value into its wire format. */
  serializeDetailValue(field: Field, value: unknown, adapter: BackendAdapter): SerializedFieldValue;
  /** True when the control renders its own label (the form omits the outer one). */
  rendersOwnLabel?: boolean;
  /**
   * Custom grid-cell renderer for this type. When present, the grid renders
   * the returned node instead of the plain `cellText` string. Use for types
   * that need to display rich markup (e.g. HTML, images, badges).
   * `field.formatter` still takes precedence over this.
   */
  CellRender?(props: { field: Field; value: unknown; row: DataRecord }): React.ReactNode;
  /** The main-form control for this type. `Field.contentRender` still wins. */
  ControlRender(props: FieldControlProps): React.ReactNode;
  /**
   * The grid filter-cell editor for this type. When omitted, the filter row
   * falls back to the operator-dropdown shell with a text input
   * (`renderDefaultFilterCell`).
   */
  FilterCellRender?(props: FilterCellProps): React.ReactNode;
  /**
   * The inline detail-grid cell editor. When omitted, the detail grid falls
   * back to a plain text input (`renderDefaultDetailCell`). A Field's own
   * `formatter` on NONE cells still wins.
   */
  DetailCellRender?(props: DetailCellProps): React.ReactNode;
}
