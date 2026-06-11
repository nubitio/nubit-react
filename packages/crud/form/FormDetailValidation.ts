import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
import type { FormDataRecord } from './FormDataSnapshot';

export function validateDetailRows(detailRows: FormDataRecord[], detailFields: Field[]): boolean {
  return detailRows.every((row) =>
    detailFields.every((field) => {
      if (field.isIdentity || field.hidden || !field.visible) return true;

      const value = row[field.name];

      if (field.required && (value === null || value === undefined || value === '')) {
        return false;
      }

      if (field.type === FieldType.NUMBER || field.type === FieldType.CURRENCY) {
        const numericValue = Number(value ?? 0);

        if (field.required && Number.isNaN(numericValue)) {
          return false;
        }

        const rangeValidators = field.validators.filter((validator) => validator.type === 'range');
        for (const validator of rangeValidators) {
          const { min, max } = validator.options;
          if (min !== undefined && numericValue < min) {
            return false;
          }
          if (max !== undefined && numericValue > max) {
            return false;
          }
        }
      }

      return true;
    }),
  );
}
