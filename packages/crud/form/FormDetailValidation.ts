import type { Field } from '../field/Field';
import { getFieldTypeModule } from '../field/registry/registry';
import type { FormDataRecord } from './FormDataSnapshot';

export function validateDetailRows(detailRows: FormDataRecord[], detailFields: Field[]): boolean {
  return detailRows.every((row) =>
    detailFields.every((field) => {
      if (field.isIdentity || field.hidden || !field.visible) return true;

      const value = row[field.name];

      if (field.required && (value === null || value === undefined || value === '')) {
        return false;
      }

      return getFieldTypeModule(field.type).validateDetailValue?.(field, value) ?? true;
    }),
  );
}
