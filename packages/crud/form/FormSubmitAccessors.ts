import type { UploadedFile } from './UploadedFile';
import type { FormDataRecord } from './FormDataSnapshot';

export interface UseFormSubmitAccessors {
  getDetailRows: () => FormDataRecord[];
  getFieldValue: (field: string) => unknown;
  getFormData: () => FormDataRecord;
  getUploadedFiles: () => UploadedFile[];
  isEditMode: () => boolean;
}
