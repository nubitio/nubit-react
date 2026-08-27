import type { FieldTypeModule } from '../FieldTypeModule';
import { renderDefaultInputControl } from '../controlHelpers';
import {
  defaultBuildFilterTerms,
  KEEP,
  set,
  TEXT_OPERATORS,
  serializeOptionalTextValue,
} from '../shared';

export const passwordTypeModule: FieldTypeModule = {
  controlKind: 'password',
  formWidth: (field) => (field.maxLength != null && field.maxLength <= 40 ? 'compact' : 'auto'),
  // Stored hashes never reach the editor; the control always starts blank.
  normalizeFormValue: () => set(''),
  defaultFilterOperator: 'contains',
  filterOperators: TEXT_OPERATORS,
  buildFilterTerms: defaultBuildFilterTerms,
  cellText: (_field, value) => (value == null || value === '' ? '' : '••••'),
  serializeFormValue: (_field, value) => serializeOptionalTextValue(value),
  serializeDetailValue: () => KEEP,
  ControlRender: (props) => renderDefaultInputControl(props, 'password'),
};
