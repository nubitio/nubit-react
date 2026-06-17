import type { Field } from '../field/Field';
import type { ResourceFormDetail } from './ResourceConfig';

/**
 * Hides the header form field that mirrors `formDetail.propertyName`.
 * OneToMany collections serialized as object arrays must not render as a
 * plain text input ([object Object]) when line items are edited via formDetail.
 */
export function applyFormDetailFormFieldOverrides(
  fields: Field[],
  formDetail?: Pick<ResourceFormDetail, 'propertyName'>,
): Field[] {
  const propertyName = formDetail?.propertyName?.trim();
  if (!propertyName) {
    return fields;
  }

  return fields.map((field) =>
    field.name === propertyName
      ? { ...field, visibleOnForm: false, hidden: true }
      : field,
  );
}