import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { normalizeRelationOption } from '../../../form/fieldOptionSource';
import { NativeEntitySelect } from '../../../form/LookupControls';
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
  // Single references fit half a row; multiple references use the chip editor.
  formWidth: (field) => (field.multiple ? 'auto' : 'compact'),
  // Editor value is the scalar entity key. Object values first register as a
  // dropdown option (so the selection displays even off the loaded page) and,
  // for Hydra, may need their `_iri` synthesized when `@id` is absent.
  normalizeFormValue: (field, rawValue, ctx) => {
    if (field.multiple) {
      if (!Array.isArray(rawValue)) return set([]);
      return set(
        rawValue
          .map((item) => normalizeRelationOption(field, item, ctx))
          .filter((item) => item !== null && item !== undefined),
      );
    }
    const normalized = normalizeRelationOption(field, rawValue, ctx);
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
    const { field, value, error, errorClass, disabled, readOnly, setFieldValue, ctx, commonProps } =
      props;
    const items = ctx.remoteOptions[field.name] ?? field.data ?? [];
    return (
      <NativeEntitySelect
        className={`nb-form__control${errorClass}`}
        disabled={disabled}
        invalid={!!error}
        describedBy={commonProps['aria-describedby']}
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
  FilterCellRender: ({ field, value, remoteOptions, httpClient, onSelectChange, t }) => (
    <NativeEntitySelect
      className="nb-datagrid__filter-select"
      placeholder={t('grid.allFilter')}
      field={field}
      httpClient={httpClient}
      options={remoteOptions}
      value={value}
      multiple={false}
      onChange={(nextVal) => onSelectChange(nextVal == null ? '' : String(nextVal))}
    />
  ),
  DetailCellRender: ({
    field,
    value,
    errorClass,
    allowUpdating,
    httpClient,
    remoteOptions,
    getPrependData,
    onChange,
  }) => (
    <NativeEntitySelect
      className={`nb-form__control${errorClass}`}
      disabled={!allowUpdating || field.disabled}
      readOnly={field.readonly}
      field={field}
      httpClient={httpClient}
      options={remoteOptions[field.name] ?? field.data ?? []}
      prependData={getPrependData(field.name)}
      multiple={false}
      value={value}
      onChange={(nextValue) => onChange(nextValue)}
    />
  ),
};
