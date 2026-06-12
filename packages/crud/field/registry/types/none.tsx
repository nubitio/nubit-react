import type { FieldTypeModule } from '../FieldTypeModule';
import { renderDefaultInputControl } from '../controlHelpers';
import {
  defaultBuildFilterTerms,
  getPrimitiveDisplay,
  KEEP,
  OMIT,
  TEXT_OPERATORS,
} from '../shared';

export const noneTypeModule: FieldTypeModule = {
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value, ctx) => getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel),
  // NONE fields are display-only and never submitted — except the identity
  // field, which the URL builder still needs.
  serializeFormValue: (field) => (field.isIdentity ? KEEP : OMIT),
  serializeDetailValue: () => KEEP,
  ControlRender: (props) => renderDefaultInputControl(props),
};
