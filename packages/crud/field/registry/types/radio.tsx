import React from 'react';
import type { FieldTypeModule } from '../FieldTypeModule';
import {
  defaultBuildFilterTerms,
  getPrimitiveDisplay,
  KEEP,
  TEXT_OPERATORS,
} from '../shared';

export const radioTypeModule: FieldTypeModule = {
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value, ctx) => getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel),
  serializeFormValue: () => KEEP,
  serializeDetailValue: () => KEEP,
  ControlRender: ({ field, value, disabled, readOnly, setFieldValue }) => (
    <div className="nb-form__radio-list">
      {(field.data ?? []).map((item) => {
        const itemValue = item['value'];
        return (
          <label key={String(itemValue)} className="nb-form__radio-item">
            <input
              type="radio"
              checked={value === itemValue}
              disabled={disabled || readOnly}
              onChange={() => setFieldValue(field.name, itemValue)}
            />
            {String(item['text'] ?? itemValue)}
          </label>
        );
      })}
    </div>
  ),
};
