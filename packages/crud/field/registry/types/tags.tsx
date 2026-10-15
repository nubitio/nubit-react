import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { normalizeRelationOption } from '../../../form/fieldOptionSource';
import { NativeEntitySelect } from '../../../form/LookupControls';
import {
  defaultBuildFilterTerms,
  getEntityDisplayValue,
  getPrimitiveDisplay,
  KEEP,
  serializeEntityFormValue,
  set,
  TEXT_OPERATORS,
} from '../shared';

export const tagsTypeModule: FieldTypeModule = {
  controlKind: 'tags',
  formWidth: () => 'full',
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  // A TAGS value is an array of entity refs (objects while the row came
  // straight from the API, scalars once normalized) — render each through
  // the same entity-display resolution as a single ENTITY field and join.
  cellText: (field, value, ctx) => {
    if (!Array.isArray(value)) return getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel);
    return value.map((item) => getEntityDisplayValue(field, item, ctx.entityOptions)).join(', ');
  },
  // TAGS submit like multi-valued entity refs.
  serializeFormValue: (field, value, ctx) => serializeEntityFormValue(field, value, ctx.adapter),
  serializeDetailValue: () => KEEP,
  // Edit mode receives an array of full entity objects (or IRI strings) from
  // the API; resolve each to its scalar key the same way a single ENTITY
  // field does, and register every item as a prepend option so its label is
  // available even if the item isn't on the first page of loaded options.
  normalizeFormValue: (field, rawValue, ctx) => {
    if (!Array.isArray(rawValue)) return set([]);
    const resolved = rawValue.map((item) => normalizeRelationOption(field, item, ctx));
    return set(resolved.filter((item) => item !== null && item !== undefined));
  },
  ControlRender: ({ field, value, error, errorClass, disabled, readOnly, setFieldValue, ctx }) => (
    <NativeEntitySelect
      className={`nb-form__control${errorClass}`}
      field={field}
      id={`nb-form-${field.name}`}
      httpClient={ctx.httpClient}
      options={ctx.remoteOptions[field.name] ?? field.data ?? []}
      prependData={ctx.getPrependData(field.name)}
      value={value}
      multiple
      disabled={disabled}
      readOnly={readOnly}
      required={field.required}
      invalid={!!error}
      describedBy={error ? `nb-form-${field.name}-error` : undefined}
      onChange={(next) => setFieldValue(field.name, next)}
    />
  ),
};
