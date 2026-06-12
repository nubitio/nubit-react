import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { NativeEntitySelect } from '../../../form/LookupControls';
import { renderDefaultInputControl } from '../controlHelpers';
import {
  defaultBuildFilterTerms,
  EQUALITY_OPERATORS,
  getEntityDisplayValue,
  OMIT,
  serializeEntityFormValue,
  set,
} from '../shared';

export const entityTypeModule: FieldTypeModule = {
  defaultFilterOperator: '=',
  filterOperators: EQUALITY_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (field, value, ctx) => getEntityDisplayValue(field, value, ctx.entityOptions),
  serializeFormValue: (field, value, ctx) => serializeEntityFormValue(field, value, ctx.adapter),
  // Detail rows always serialize a single ref (no `multiple` handling).
  serializeDetailValue: (field, value, adapter) => {
    const serialized = adapter.serializeEntityRef(field, value);
    return serialized === undefined ? OMIT : set(serialized);
  },
  ControlRender: (props) => {
    const { field, value, errorClass, disabled, readOnly, setFieldValue, ctx } = props;
    // Multi-valued entities fall through to the plain input (legacy behaviour).
    if (field.multiple) return renderDefaultInputControl(props);
    const items = ctx.remoteOptions[field.name] ?? field.data ?? [];
    return (
      <NativeEntitySelect
        className={`nb-form__control${errorClass}`}
        disabled={disabled}
        field={field}
        httpClient={ctx.httpClient}
        id={`nb-form-${field.name}`}
        options={items}
        prependData={ctx.getPrependData(field.name)}
        readOnly={readOnly}
        required={field.required}
        value={value}
        onChange={(nextValue, item) => {
          setFieldValue(field.name, nextValue);
          field.onSelect?.({ value: nextValue, itemData: item ?? undefined });
        }}
      />
    );
  },
  FilterCellRender: ({ field, value, remoteOptions, httpClient, onSelectChange }) => (
    <NativeEntitySelect
      className="nb-datagrid__filter-select"
      field={field}
      httpClient={httpClient}
      options={remoteOptions}
      value={value}
      onChange={(nextVal) => onSelectChange(nextVal ? String(nextVal) : '')}
    />
  ),
  DetailCellRender: ({ field, value, errorClass, allowUpdating, httpClient, remoteOptions, getPrependData, onChange }) => (
    <NativeEntitySelect
      className={`nb-form__control${errorClass}`}
      disabled={!allowUpdating || field.disabled}
      field={field}
      httpClient={httpClient}
      options={remoteOptions[field.name] ?? field.data ?? []}
      prependData={getPrependData(field.name)}
      value={value}
      onChange={(nextValue) => onChange(nextValue)}
    />
  ),
};
