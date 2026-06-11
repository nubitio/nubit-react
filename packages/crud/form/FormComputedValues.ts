import type { FormDataRecord } from './FormDataSnapshot';

export function syncComputedValuesIntoFormData(
  formData: FormDataRecord,
  computedFieldNames: string[],
  computedValues: FormDataRecord,
): { changed: boolean; nextFormData: FormDataRecord } {
  let changed = false;
  const nextFormData = { ...formData };

  computedFieldNames.forEach((name) => {
    const hasComputedValue = Object.prototype.hasOwnProperty.call(computedValues, name);
    const value = hasComputedValue ? computedValues[name] : undefined;

    if (nextFormData[name] !== value) {
      nextFormData[name] = value;
      changed = true;
    }
  });

  return { changed, nextFormData };
}
