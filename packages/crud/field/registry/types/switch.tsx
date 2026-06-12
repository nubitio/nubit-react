import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { FilterValueDropdown } from '../filterHelpers';
import {
  defaultBuildFilterTerms,
  EQUALITY_OPERATORS,
  getEnumDisplayValue,
  KEEP,
} from '../shared';

export const switchTypeModule: FieldTypeModule = {
  defaultFilterOperator: '=',
  filterOperators: EQUALITY_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  // SWITCH cells resolve through field.data like ENUM (on/off option labels).
  cellText: (field, value) => getEnumDisplayValue(field, value),
  serializeFormValue: () => KEEP,
  serializeDetailValue: () => KEEP,
  rendersOwnLabel: true,
  ControlRender: ({ field, value, disabled, readOnly, setFieldValue }) => (
    <label className="nb-form__switch">
      <input
        type="checkbox"
        checked={Boolean(value)}
        disabled={disabled || readOnly}
        onChange={(event) => setFieldValue(field.name, event.target.checked)}
      />
      <span className="nb-form__toggle-label">{field.label}</span>
    </label>
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
};
