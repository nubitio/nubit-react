import type { UseFormComputedValuesAccessors } from './FormComputedValuesAccessors';
import type { FormDataChangedHandler, FormDataSnapshot } from './FormDataSnapshot';

export interface UseFormComputedValuesOptions {
  accessors: UseFormComputedValuesAccessors;
  computedFieldNames: string[];
  computedValues?: FormDataSnapshot;
  onFieldDataChanged?: FormDataChangedHandler;
}
