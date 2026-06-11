import { useEffect } from 'react';

import { syncComputedValuesIntoFormData } from './FormComputedValues';
import type { UseFormComputedValuesOptions } from './FormComputedValuesOptions';

export type { UseFormComputedValuesAccessors } from './FormComputedValuesAccessors';
export type { UseFormComputedValuesOptions } from './FormComputedValuesOptions';

export function useFormComputedValues({
  accessors,
  computedFieldNames,
  computedValues,
  onFieldDataChanged,
}: UseFormComputedValuesOptions): void {
  useEffect(() => {
    if (computedFieldNames.length === 0) {
      return;
    }

    const currentFormData = accessors.getFormData();
    if (currentFormData == null) {
      return;
    }

    const { changed, nextFormData } = syncComputedValuesIntoFormData(
      currentFormData,
      computedFieldNames,
      computedValues ?? {},
    );

    if (!changed) {
      return;
    }

    accessors.setFormData(nextFormData);
    onFieldDataChanged?.(nextFormData);
  }, [accessors, computedFieldNames, computedValues, onFieldDataChanged]);
}
