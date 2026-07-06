import type { FieldTypeModule } from '../FieldTypeModule';
import { renderDefaultInputControl } from '../controlHelpers';
import {
  defaultBuildFilterTerms,
  getPrimitiveDisplay,
  KEEP,
  set,
  TEXT_OPERATORS,
} from '../shared';

export const textTypeModule: FieldTypeModule = {
  controlKind: 'text',
  formWidth: (field) => {
    if (field.maxLength != null && field.maxLength > 80) return 'full';
    if (field.maxLength != null && field.maxLength <= 40) return 'compact';
    return 'auto';
  },
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value, ctx) => getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel),
  // A TEXT field with valueType 'number' is always coerced, even when the key
  // is absent from the payload (legacy behaviour, preserved verbatim).
  serializeFormValue: (field, value) =>
    field.valueType === 'number' ? set(Number(value)) : KEEP,
  serializeDetailValue: () => KEEP,
  ControlRender: (props) => renderDefaultInputControl(props),
};
