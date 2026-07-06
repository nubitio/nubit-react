import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import type { FormDataRecord } from '../../../form/FormDataSnapshot';
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
  controlKind: 'select',
  // Multi-valued entities render the full-row plain input; single refs fit half.
  formWidth: (field) => (field.multiple ? 'auto' : 'compact'),
  // Editor value is the scalar entity key. Object values first register as a
  // dropdown option (so the selection displays even off the loaded page) and,
  // for Hydra, may need their `_iri` synthesized when `@id` is absent.
  normalizeFormValue: (field, rawValue, ctx) => {
    if (typeof rawValue === 'object' && rawValue !== null) {
      const entityValue = { ...(rawValue as FormDataRecord) };
      if (field.valueField === '_iri') {
        const synthesized = ctx.adapter.synthesizeEntityKey(field, entityValue);
        if (
          synthesized &&
          typeof entityValue['_iri'] !== 'string' &&
          typeof entityValue['@id'] !== 'string'
        ) {
          entityValue['_iri'] = synthesized;
        }
      }
      ctx.prependEntityOption(field, entityValue);
    }

    const normalized = ctx.adapter.normalizeEntityValue(rawValue, field);
    if (normalized !== null && normalized !== undefined) return set(normalized);
    return set(ctx.getPrependData(field)?.[0] ?? field.loadOptions[0]?.prependData?.[0] ?? null);
  },
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
