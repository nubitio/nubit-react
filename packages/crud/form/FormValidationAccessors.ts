import type { FormDataRecord } from './FormDataSnapshot';

export interface UseFormValidationAccessors {
  getDetailRowCount: () => number;
  getDetailRows: () => FormDataRecord[];
  hasPendingDetailEdits: () => boolean;
  validateForm: () => boolean;
}
