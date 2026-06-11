import { useCoreRuntime } from '@nubitio/core';
import { validateDetailRows } from './FormDetailValidation';
import type { UseFormValidationOptions } from './FormValidationOptions';

export type { UseFormValidationAccessors } from './FormValidationAccessors';
export type { UseFormValidationOptions } from './FormValidationOptions';

export function useFormValidation({
  accessors,
  detailFields,
  detailNoDataText,
  requiredDetail,
  validationErrorText,
}: UseFormValidationOptions): () => boolean {
  const { notify } = useCoreRuntime();

  return () => {
    const formValid = accessors.validateForm();
    let gridValid = !accessors.hasPendingDetailEdits();
    let detailRequiredMissing = false;
    let detailRowsValid = true;

    if (requiredDetail) {
      gridValid = accessors.getDetailRowCount() > 0;
      if (!gridValid) {
        detailRequiredMissing = true;
      }
    }

    if (detailFields) {
      detailRowsValid = validateDetailRows(accessors.getDetailRows(), detailFields);
    }

    if (!formValid || !gridValid || !detailRowsValid) {
      notify(
        detailRequiredMissing && formValid ? detailNoDataText : validationErrorText,
        detailRequiredMissing && formValid ? 'warning' : 'error',
      );
    }

    return formValid && gridValid && detailRowsValid;
  };
}
