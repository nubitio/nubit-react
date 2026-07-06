import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { fieldKeyValue, fieldTextValue } from '../../../form/fieldOptionSource';
import {
  defaultBuildFilterTerms,
  getPrimitiveDisplay,
  KEEP,
  serializeEntityFormValue,
  TEXT_OPERATORS,
} from '../shared';

export const tagsTypeModule: FieldTypeModule = {
  controlKind: 'tags',
  formWidth: () => 'full',
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value, ctx) => getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel),
  // TAGS submit like multi-valued entity refs.
  serializeFormValue: (field, value, ctx) => serializeEntityFormValue(field, value, ctx.adapter),
  serializeDetailValue: () => KEEP,
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
