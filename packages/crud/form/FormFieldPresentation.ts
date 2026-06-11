import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';

export interface FormFieldPresentation {
  hideLabel: boolean;
  useFloatingLabel: boolean;
}

export function getFormFieldPresentation(field: Field): FormFieldPresentation {
  const hideLabel = [FieldType.CHECKBOX, FieldType.SWITCH].includes(field.type);

  return {
    hideLabel,
    useFloatingLabel: !hideLabel && field.type !== FieldType.FILE && field.type !== FieldType.HTML,
  };
}
