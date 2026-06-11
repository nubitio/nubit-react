import React from 'react';
import { FieldType } from './FieldType';
import { Field, FieldButton, LoadOption } from './Field';
import type { FormLayoutHint } from '../form/resolveFieldColSpan';
import { FilterRule } from './FilterRule';
import { ValidationRule } from './ValidationRule';
import { FormatterFn, GridCellContext, ItemFormatterFn, OnChangeFn } from './FieldCallbacks';
import type { DataRecord } from '@nubit/core';

export class BaseFieldBuilder<TRecord extends DataRecord = DataRecord> {
  protected _field: Field;

  constructor(type: FieldType) {
    this._field = {
      isIdentity: false,
      type,
      col: undefined,
      name: '',
      label: '',
      width: undefined,
      height: null,
      minWidth: undefined,
      align: 'left',
      sortable: true,
      filterable: true,
      hideable: true,
      validators: [],
      url: undefined,
      loadOptions: [],
      filters: [],
      byKeyUrl: null,
      textField: '',
      valueField: '',
      valueType: 'string',
      filterValue: undefined,
      selectedFilterOperation: undefined,
      data: [],
      format: '',
      formatter: undefined,
      itemFormatter: undefined,
      visible: true,
      defaultValue: undefined,
      onChange: undefined,
      onSelect: undefined,
      onClick: undefined,
      readonly: false,
      disabled: false,
      hidden: false,
      required: false,
      precision: 0,
      accept: null,
      buttons: [],
      searchEnabled: true,
      searchExpr: null,
      helpText: undefined,
      contentRender: null,
      visibleOnForm: true,
      maxLength: undefined,
      multiple: false,
      autoSelectIfSingle: false,
      sendAsString: false,
    };
  }

  isIdentity(isIdentity: boolean): this {
    this._field.isIdentity = isIdentity;
    return this;
  }

  col(col: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12): this {
    this._field.col = col;
    return this;
  }

  layoutHint(value: FormLayoutHint): this {
    this._field.layoutHint = value;
    return this;
  }

  cardRole(value: 'title' | 'primary' | 'secondary' | 'hidden'): this {
    this._field.cardRole = value;
    return this;
  }

  preferredColSpan(value: 6 | 12): this {
    this._field.preferredColSpan = value;
    return this;
  }

  minColSpan(value: 6 | 12): this {
    this._field.minColSpan = value;
    return this;
  }

  forceFullWidth(value = true): this {
    this._field.forceFullWidth = value;
    return this;
  }

  name(name: string): this {
    this._field.name = name;
    return this;
  }

  label(label: string): this {
    this._field.label = label;
    return this;
  }

  width(width: number | string): this {
    this._field.width = width;
    return this;
  }

  height(height: number): this {
    this._field.height = height;
    return this;
  }

  minWidth(minWidth: number): this {
    this._field.minWidth = minWidth;
    return this;
  }

  align(align: 'left' | 'center' | 'right'): this {
    this._field.align = align;
    return this;
  }

  sortable(sortable: boolean): this {
    this._field.sortable = sortable;
    return this;
  }

  filterable(filterable: boolean): this {
    this._field.filterable = filterable;
    return this;
  }

  hideable(hideable: boolean): this {
    this._field.hideable = hideable;
    return this;
  }

  validators(validators: ValidationRule[]): this {
    this._field.validators = validators;
    return this;
  }

  valueType(valueType: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'datetime'): this {
    this._field.valueType = valueType;
    return this;
  }

  filterValue(filterValue: string | number | boolean | Date | null | undefined): this {
    this._field.filterValue = filterValue;
    return this;
  }

  data(data: DataRecord[]): this {
    this._field.data = data;
    return this;
  }

  format(format: string): this {
    this._field.format = format;
    return this;
  }

  formatter(formatter: (cell: GridCellContext<TRecord>) => React.ReactNode): this {
    this._field.formatter = formatter as FormatterFn;
    return this;
  }

  itemFormatter(itemFormatter: ItemFormatterFn): this {
    this._field.itemFormatter = itemFormatter;
    return this;
  }

  visible(visible: boolean): this {
    this._field.visible = visible;
    return this;
  }

  defaultValue(
    defaultValue: string | number | boolean | Date | null | undefined | (() => unknown),
  ): this {
    this._field.defaultValue = defaultValue;
    return this;
  }

  onChange(onChange: OnChangeFn): this {
    this._field.onChange = onChange;
    return this;
  }

  onSelect(onSelect: (e: unknown) => void): this {
    this._field.onSelect = onSelect;
    return this;
  }

  onClick(onClick: (e: unknown) => void): this {
    this._field.onClick = onClick;
    return this;
  }

  readonly(readonly: boolean): this {
    this._field.readonly = readonly;
    return this;
  }

  disabled(disabled: boolean): this {
    this._field.disabled = disabled;
    return this;
  }

  hidden(hidden: boolean): this {
    this._field.hidden = hidden;
    return this;
  }

  required(required: boolean): this {
    this._field.required = required;
    return this;
  }

  precision(value: number): this {
    this._field.precision = value;
    return this;
  }

  accept(value: string | null | undefined): this {
    this._field.accept = value;
    return this;
  }

  buttons(value: FieldButton[]): this {
    this._field.buttons = value;
    return this;
  }

  searchEnabled(value: boolean): this {
    this._field.searchEnabled = value;
    return this;
  }

  searchExpr(value: string[]): this {
    this._field.searchExpr = value;
    return this;
  }

  helpText(value: string) {
    this._field.helpText = value;
    return this;
  }

  contentRender(value: string | ((...args: unknown[]) => React.ReactNode) | null | undefined) {
    this._field.contentRender = value;
    return this;
  }

  visibleOnForm(value: boolean) {
    this._field.visibleOnForm = value;
    return this;
  }

  autoSelectIfSingle(value: boolean): this {
    this._field.autoSelectIfSingle = value;
    return this;
  }

  url(url: string): this {
    this._field.url = url;
    return this;
  }

  loadOptions(param: LoadOption[]): this {
    this._field.loadOptions = param;
    return this;
  }

  filters(filters: FilterRule[]): this {
    this._field.filters = filters;
    return this;
  }

  byKeyUrl(byKeyUrl: string): this {
    this._field.byKeyUrl = byKeyUrl;
    return this;
  }

  textField(textField: string): this {
    this._field.textField = textField;
    return this;
  }

  valueField(valueField: string): this {
    this._field.valueField = valueField;
    return this;
  }

  selectedFilterOperation(
    operation:
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
      | 'startswith',
  ): this {
    this._field.selectedFilterOperation = operation;
    return this;
  }

  sendAsString(value: boolean): this {
    this._field.sendAsString = value;
    return this;
  }

  multiple(value: boolean): this {
    this._field.multiple = value;
    return this;
  }

  maxLength(value: number): this {
    this._field.maxLength = value;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Declarative rules (SLICE-006)
  // ---------------------------------------------------------------------------

  visibleWhen(fn: (formData: TRecord) => boolean): this {
    this._field.visibleWhen = fn as (formData: DataRecord) => boolean;
    return this;
  }

  disabledWhen(fn: (formData: TRecord) => boolean): this {
    this._field.disabledWhen = fn as (formData: DataRecord) => boolean;
    return this;
  }

  computed(fn: (formData: TRecord) => unknown): this {
    this._field.computed = fn as (formData: DataRecord) => unknown;
    return this;
  }

  defaultWhen(fn: (formData: TRecord) => unknown): this {
    this._field.defaultWhen = fn as (formData: DataRecord) => unknown;
    return this;
  }

  requiredWhen(fn: (formData: TRecord) => boolean): this {
    this._field.requiredWhen = fn as (formData: DataRecord) => boolean;
    return this;
  }

  clearWhenHidden(value = true): this {
    this._field.clearWhenHidden = value;
    return this;
  }

  dependsOn(fields: string[]): this {
    this._field.dependsOn = fields;
    return this;
  }

  permissions(perms: { visible?: string[]; editable?: string[] }): this {
    this._field.permissions = perms;
    return this;
  }

  build(): Field {
    return { ...this._field };
  }
}
