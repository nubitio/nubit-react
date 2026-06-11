import type { FormDataRecord } from './FormDataSnapshot';

export interface UseFormComputedValuesAccessors {
  getFormData: () => FormDataRecord | null;
  setFormData: (formData: FormDataRecord) => void;
}
