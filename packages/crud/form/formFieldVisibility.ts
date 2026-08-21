import type { Field } from '../field/Field';

/** Field-state flags that can hide a control after the form has mounted. */
export interface FormFieldVisibilityState {
  hidden?: boolean;
}

/**
 * Whether a header field actually renders in NativeFormView.
 *
 * Mirrors `renderField`: identity, `visibleOnForm: false`, `hidden`, and
 * runtime `fieldState.hidden` all drop the control. Used to collapse the
 * empty master column when a document form is detail-only.
 */
export function isVisibleFormField(field: Field, fieldState?: FormFieldVisibilityState): boolean {
  if (field.isIdentity || !field.visibleOnForm || field.hidden || fieldState?.hidden) {
    return false;
  }
  return true;
}

export function hasVisibleFormFields(
  fields: Field[],
  fieldState: Record<string, FormFieldVisibilityState | undefined> = {},
): boolean {
  return fields.some((field) => isVisibleFormField(field, fieldState[field.name]));
}
