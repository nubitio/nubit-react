import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { FilterValueDropdown } from '../filterHelpers';
import { NativeEnumSelect } from '../../../form/LookupControls';
import {
  defaultBuildFilterTerms,
  EQUALITY_OPERATORS,
  getEnumDisplayValue,
  KEEP,
} from '../shared';

export const enumTypeModule: FieldTypeModule = {
  controlKind: 'select',
  formWidth: () => 'compact',
  defaultFilterOperator: '=',
  filterOperators: EQUALITY_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (field, value) => getEnumDisplayValue(field, value),
  serializeFormValue: () => KEEP,
  serializeDetailValue: () => KEEP,
  ControlRender: ({ field, value, errorClass, disabled, readOnly, setFieldValue }) => (
    <NativeEnumSelect
      className={`nb-form__control${errorClass}`}
      disabled={disabled}
      field={field}
      id={`nb-form-${field.name}`}
      readOnly={readOnly}
      required={field.required}
      value={value}
      onChange={(nextValue) => setFieldValue(field.name, nextValue)}
    />
  ),
  FilterCellRender: ({ field, value, t, onSelectChange }) => (
    <FilterValueDropdown
      id={`nb-datagrid-filter-${field.name}`}
      value={value}
      className="nb-datagrid__filter-select"
      placeholder={t('grid.allFilter')}
      options={(field.data ?? []).map((item) => ({
        value: String(item['value'] ?? ''),
        label: String(item['text'] ?? item['value'] ?? ''),
      }))}
      onChange={onSelectChange}
    />
  ),
  DetailCellRender: ({ field, value, errorClass, allowUpdating, onChange }) => (
    <NativeEnumSelect
      className={`nb-form__control${errorClass}`}
      disabled={!allowUpdating || field.disabled}
      field={field}
      value={value}
      onChange={onChange}
    />
  ),
};
