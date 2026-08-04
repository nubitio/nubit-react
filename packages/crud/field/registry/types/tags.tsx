import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { fieldKeyValue, fieldTextValue } from '../../../form/fieldOptionSource';
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
    const resolved = rawValue.map((item) => {
      if (typeof item === 'object' && item !== null) {
        ctx.prependEntityOption(field, item as Record<string, unknown>);
      }
      return ctx.adapter.normalizeEntityValue(item, field);
    });
    return set(resolved.filter((item) => item !== null && item !== undefined));
  },
  ControlRender: ({ field, value, commonProps, setFieldValue, ctx }) => {
    const items = ctx.remoteOptions[field.name] ?? field.data ?? [];
    return (
      <select
        {...commonProps}
        multiple
        value={Array.isArray(value) ? value.map(String) : []}
        onChange={(event) => {
          const nextValue = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
          setFieldValue(field.name, nextValue);
        }}
      >
        {items.map((item) => {
          const itemValue = fieldKeyValue(field, item);
          const itemText = fieldTextValue(field, item);
          return (
            <option key={String(itemValue)} value={String(itemValue ?? '')}>
              {itemText}
            </option>
          );
        })}
      </select>
    );
  },
};
