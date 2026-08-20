import type { CoreTranslationKeys, DataRecord } from '@nubitio/core';
import type { Field, FormDataRecord } from '@nubitio/crud';

export function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function withDetailRowKeys(rows: FormDataRecord[]): FormDataRecord[] {
  return rows.map((row) => ({
    ...row,
    __rowKey: typeof row.__rowKey === 'string' ? row.__rowKey : crypto.randomUUID(),
  }));
}

export function validateField(
  field: Field,
  value: unknown,
  formData: FormDataRecord,
  t: (key: keyof CoreTranslationKeys, options?: DataRecord) => string,
): string | null {
  if (field.required && isEmptyValue(value)) {
    return t('form.fieldRequired', { label: field.label });
  }

  for (const rule of field.validators ?? []) {
    if (rule.type === 'required' && isEmptyValue(value)) {
      return rule.options.message ?? t('form.fieldRequired', { label: field.label });
    }
    if (
      rule.type === 'email' &&
      typeof value === 'string' &&
      value !== '' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      return rule.options.message ?? t('form.invalidEmail');
    }
    if (rule.type === 'numeric' && value !== '' && value != null && Number.isNaN(Number(value))) {
      return rule.options.message ?? t('form.invalidNumeric');
    }
    if (
      rule.type === 'pattern' &&
      typeof value === 'string' &&
      !new RegExp(rule.options.pattern).test(value)
    ) {
      return rule.options.message ?? t('form.invalidPattern');
    }
    if (rule.type === 'stringLength' && typeof value === 'string') {
      if (rule.options.min !== undefined && value.length < rule.options.min) {
        return rule.options.message ?? t('form.stringTooShort');
      }
      if (rule.options.max !== undefined && value.length > rule.options.max) {
        return rule.options.message ?? t('form.stringTooLong');
      }
    }
    if (rule.type === 'range' && value !== '' && value != null) {
      const numericValue = Number(value);
      if (rule.options.min !== undefined && numericValue < rule.options.min) {
        return rule.options.message ?? t('form.outOfRange');
      }
      if (rule.options.max !== undefined && numericValue > rule.options.max) {
        return rule.options.message ?? t('form.outOfRange');
      }
    }
    if (rule.type === 'custom') {
      const valid = rule.options.validationCallback({ value, data: formData });
      if (!valid) return rule.options.message ?? t('validation.defaultError');
    }
  }

  return null;
}
