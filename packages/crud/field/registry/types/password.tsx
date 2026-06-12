import type { FieldTypeModule } from '../FieldTypeModule';
import { renderDefaultInputControl } from '../controlHelpers';
import {
  defaultBuildFilterTerms,
  getPrimitiveDisplay,
  KEEP,
  TEXT_OPERATORS,
} from '../shared';

export const passwordTypeModule: FieldTypeModule = {
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value, ctx) => getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel),
  serializeFormValue: () => KEEP,
  serializeDetailValue: () => KEEP,
  ControlRender: (props) => renderDefaultInputControl(props, 'password'),
};
