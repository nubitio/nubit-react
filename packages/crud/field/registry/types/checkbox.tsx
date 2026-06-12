import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import {
  defaultBuildFilterTerms,
  getPrimitiveDisplay,
  KEEP,
  TEXT_OPERATORS,
} from '../shared';

export const checkboxTypeModule: FieldTypeModule = {
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  // Booleans render through the primitive display (Yes/No labels).
  cellText: (_field, value, ctx) => getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel),
  serializeFormValue: () => KEEP,
  serializeDetailValue: () => KEEP,
  rendersOwnLabel: true,
  ControlRender: ({ field, value, disabled, readOnly, setFieldValue }) => (
    <label className="nb-form__checkbox">
      <input
        type="checkbox"
        checked={Boolean(value)}
        disabled={disabled || readOnly}
        onChange={(event) => setFieldValue(field.name, event.target.checked)}
      />
      <span>{field.label}</span>
    </label>
  ),
};
