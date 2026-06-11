import { useCallback } from 'react';

import type { FormDataChangedHandler, FormDataSnapshot } from './FormDataSnapshot';

export function useFormFieldDataChanged(
  onFieldDataChanged?: FormDataChangedHandler,
): FormDataChangedHandler | undefined {
  const handleFieldDataChanged = useCallback(
    (formData: FormDataSnapshot) => {
      onFieldDataChanged?.(formData);
    },
    [onFieldDataChanged],
  );

  return onFieldDataChanged ? handleFieldDataChanged : undefined;
}
