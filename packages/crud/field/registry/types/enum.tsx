import React from 'react';
import { Badge, type BadgeVariant } from '@nubitio/ui';
import type { FieldTypeModule } from '../FieldTypeModule';
import { FilterValueDropdown } from '../filterHelpers';
import { NativeEnumSelect } from '../../../form/LookupControls';
import {
  defaultBuildFilterTerms,
  EQUALITY_OPERATORS,
  getEnumDisplayValue,
  KEEP,
  serializeOptionalTextValue,
} from '../shared';

const BADGE_VARIANTS = new Set<BadgeVariant>([
  'primary',
  'secondary',
  'success',
  'danger',
  'warning',
  'info',
  'light',
  'dark',
]);

export const enumTypeModule: FieldTypeModule = {
  controlKind: 'select',
  formWidth: () => 'compact',
  defaultFilterOperator: '=',
  filterOperators: EQUALITY_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (field, value) => getEnumDisplayValue(field, value),
  CellRender: ({ field, value }) => {
    const label = getEnumDisplayValue(field, value);
    if (field.presentation !== 'badge') return label;

    const configuredTone = field.toneByValue?.[String(value ?? '')];
    const variant: BadgeVariant =
      configuredTone && BADGE_VARIANTS.has(configuredTone as BadgeVariant)
        ? configuredTone as BadgeVariant
        : 'secondary';

    return <Badge variant={variant} size="sm" pill>{label}</Badge>;
  },
  serializeFormValue: (_field, value) => serializeOptionalTextValue(value),
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
