import type { FieldTypeModule } from '../FieldTypeModule';
import { renderDefaultInputControl } from '../controlHelpers';
import { renderDefaultFilterCell } from '../filterHelpers';
import { renderDefaultDetailCell } from '../controlHelpers';
import {
  defaultBuildFilterTerms,
  getCurrencyDisplay,
  KEEP,
  NUMERIC_OPERATORS,
  serializeNumericValue,
  validateNumericDetailValue,
} from '../shared';

export const currencyTypeModule: FieldTypeModule = {
  controlKind: 'number',
  formWidth: () => 'compact',
  validateDetailValue: validateNumericDetailValue,
  defaultFilterOperator: '=',
  filterOperators: NUMERIC_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value) => getCurrencyDisplay(value),
  // Identity (primary key) fields skip numeric coercion: UUID / string keys
  // must reach the URL builder as-is (BUG-011).
  serializeFormValue: (field, value) =>
    field.isIdentity ? KEEP : serializeNumericValue(field, value),
  serializeDetailValue: (field, value) => serializeNumericValue(field, value),
  ControlRender: (props) => renderDefaultInputControl(props, 'number'),
  FilterCellRender: (cell) => renderDefaultFilterCell(cell, NUMERIC_OPERATORS, 'number'),
  DetailCellRender: (cell) => renderDefaultDetailCell(cell, 'number'),
};
