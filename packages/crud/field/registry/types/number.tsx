import type { FieldTypeModule } from '../FieldTypeModule';
import { renderDefaultInputControl } from '../controlHelpers';
import { renderDefaultFilterCell } from '../filterHelpers';
import { renderDefaultDetailCell } from '../controlHelpers';
import {
  defaultBuildFilterTerms,
  getPrimitiveDisplay,
  KEEP,
  NUMERIC_OPERATORS,
  serializeNumericValue,
} from '../shared';

export const numberTypeModule: FieldTypeModule = {
  defaultFilterOperator: '=',
  filterOperators: NUMERIC_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value, ctx) => getPrimitiveDisplay(value, ctx.yesLabel, ctx.noLabel),
  // Identity (primary key) fields skip numeric coercion: UUID / string keys
  // must reach the URL builder as-is (BUG-011).
  serializeFormValue: (field, value) =>
    field.isIdentity ? KEEP : serializeNumericValue(field, value),
  serializeDetailValue: (field, value) => serializeNumericValue(field, value),
  ControlRender: (props) => renderDefaultInputControl(props, 'number'),
  FilterCellRender: (cell) => renderDefaultFilterCell(cell, NUMERIC_OPERATORS, 'number'),
  DetailCellRender: (cell) => renderDefaultDetailCell(cell, 'number'),
};
