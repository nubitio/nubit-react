import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import { inputValue } from '../../../form/fieldOptionSource';
import {
  defaultBuildFilterTerms,
  getPrimitiveDisplay,
  KEEP,
  TEXT_OPERATORS,
} from '../shared';

export const textareaTypeModule: FieldTypeModule = {
  controlKind: 'textarea',
  formWidth: () => 'full',
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value, ctx) => getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel),
  serializeFormValue: () => KEEP,
  serializeDetailValue: () => KEEP,
  ControlRender: ({ field, value, commonProps, errorClass, setFieldValue }) => (
    <textarea
      {...commonProps}
      className={`nb-form__control nb-form__textarea${errorClass}`}
      value={inputValue(value)}
      onChange={(event) => setFieldValue(field.name, event.target.value)}
    />
  ),
};
