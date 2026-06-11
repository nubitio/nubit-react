import type { Field } from '../field/Field';

import type { UseFormValidationAccessors } from './FormValidationAccessors';

export interface UseFormValidationOptions {
  accessors: UseFormValidationAccessors;
  detailFields?: Field[];
  detailNoDataText: string;
  requiredDetail?: boolean;
  validationErrorText: string;
}
