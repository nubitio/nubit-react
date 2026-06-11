import { FieldType } from './FieldType';
import { FilterRule } from './FilterRule';
import { ValidationRule } from './ValidationRule';
import { FormatterFn, GridOnChangeFn, ItemFormatterFn, OnChangeFn } from './FieldCallbacks';
import type { FormLayoutHint } from '../form/resolveFieldColSpan';
import React from 'react';
import type { DataRecord } from '@nubitio/core';

export type LoadOption = Record<string, any>;

export interface FieldButton {
  name?: string;
  location?: string;
  options?: {
    icon?: string;
    stylingMode?: string;
    onClick?: (event: unknown, form: { getFieldValue: (name: string) => unknown; setFieldValue: (name: string, value: unknown) => void }) => void;
  };
}

export interface Field {
  isIdentity: boolean;
  type: FieldType;
  col: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | undefined;
  name: string;
  label: string;
  width: string | number | undefined;
  height: number | null;
  minWidth: number | undefined;
  align: 'left' | 'center' | 'right' | undefined;
  sortable: boolean;
  filterable: boolean;
  hideable: boolean;
  validators: ValidationRule[];
  url: string | undefined;
  loadOptions: LoadOption[];
  filters: FilterRule[];
  byKeyUrl: string | null;
  textField: string;
  valueField: string;
  valueType: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'datetime';
  format: string;
  selectedFilterOperation:
    | '<'
    | '<='
    | '<>'
    | '='
    | '>'
    | '>='
    | 'between'
    | 'contains'
    | 'endswith'
    | 'notcontains'
    | 'startswith'
    | undefined;
  filterValue: string | number | boolean | Date | null | undefined;
  data: DataRecord[];
  formatter: FormatterFn | undefined;
  itemFormatter: ItemFormatterFn | undefined;
  visible: boolean;
  defaultValue: string | number | boolean | Date | null | undefined | (() => unknown);
  // When true, form building logic may auto-select the single available option
  // for ENTITY/TAGS fields (only applied if defaultValue is undefined).
  autoSelectIfSingle?: boolean;
  onChange: OnChangeFn | undefined;
  onSelect: ((e: unknown) => void) | undefined;
  onClick: ((e: unknown) => void) | undefined;
  readonly: boolean;
  disabled: boolean;
  hidden: boolean;
  required: boolean;
  precision: number;
  accept: string | null | undefined;
  buttons: FieldButton[];
  searchEnabled: boolean;
  searchExpr: string[] | null;
  helpText: string | undefined;
  contentRender: string | ((...args: unknown[]) => React.ReactNode) | null | undefined;
  visibleOnForm: boolean;
  maxLength: number | undefined;
  multiple: boolean;
  sendAsString: boolean;
  /** Column display order hint set via `x-crud.order` from Hydra metadata. */
  order?: number;

  /**
   * Mobile card layout hint:
   * - 'title'     → rendered as the card title (bold, no label)
   * - 'primary'   → always-visible labelled row
   * - 'secondary' → collapsed behind the card's "show more" toggle
   * - 'hidden'    → never shown on the card
   * Without hints the grid uses the first non-date visible column as title
   * and the next four columns as primary rows.
   */
  cardRole?: 'title' | 'primary' | 'secondary' | 'hidden';

  /** Optional visual layout hint for auto column resolution. */
  layoutHint?: FormLayoutHint;

  /** Preferred grid span when auto layout is active. */
  preferredColSpan?: 6 | 12;

  /** Minimum grid span when auto layout is active. */
  minColSpan?: 6 | 12;

  /** Forces full-width layout regardless of heuristics (explicit `col` still wins). */
  forceFullWidth?: boolean;

  // ---------------------------------------------------------------------------
  // Declarative rules (SLICE-006) — all optional, do NOT break existing fields
  // ---------------------------------------------------------------------------

  /** Returns true when the field should be visible */
  visibleWhen?: (formData: DataRecord) => boolean;

  /** Returns true when the field should be disabled (read-only in form) */
  disabledWhen?: (formData: DataRecord) => boolean;

  /** Derived value — field is rendered as read-only with this computed value */
  computed?: (formData: DataRecord) => unknown;

  /** Default value applied when the current value is empty for the current form data */
  defaultWhen?: (formData: DataRecord) => unknown;

  /** Returns true when the field should be required for the current form data */
  requiredWhen?: (formData: DataRecord) => boolean;

  /** Clears the field value when `visibleWhen` hides it. */
  clearWhenHidden?: boolean;

  /** When listed fields change, reload this field's options (entityField / enumField) */
  dependsOn?: string[];

  /** UI-only RBAC — field is hidden/readonly based on user roles */
  permissions?: {
    /** Roles that can SEE this field. Omit = visible to all. */
    visible?: string[];
    /** Roles that can EDIT this field. Omit = editable by all who can see it. */
    editable?: string[];
  };
}

/**
 * Generic extension of `Field` that narrows `defaultValue` and `onChange`
 * to the value types of a specific resource record type `T`.
 *
 * Use `FieldDef<T>` when you want type-safe field definitions for a known
 * resource shape. Falls back to `DataRecord` when `T` is omitted.
 *
 * `defaultValue` and `onChange` are re-declared with generic-aware types;
 * all other `Field` properties are inherited unchanged.
 */
export type FieldDef<T extends DataRecord = DataRecord> = Omit<
  Field,
  'defaultValue' | 'onChange'
> & {
  defaultValue?: T[keyof T] | (() => T[keyof T]);
  onChange?: ((value: T[keyof T]) => void | Promise<void>) | GridOnChangeFn;
};
