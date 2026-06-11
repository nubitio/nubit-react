import { useMemo } from 'react';
import type { Field } from '../../field/Field';
import type { FormDataRecord } from '../../form/FormDataSnapshot';

export interface FieldState {
  name: string;
  visible: boolean;
  disabled: boolean;
  required: boolean;
  computedValue?: unknown;
}

function isEmptyRuleValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export function evaluateConditionalRuleState(
  field: Field,
  formData: FormDataRecord | null,
): FieldState {
  const baseVisible = field.visibleOnForm;
  const baseRequired = field.required;

  if (formData == null) {
    return {
      name: field.name,
      visible: baseVisible,
      disabled: false,
      required: baseRequired,
      computedValue: undefined,
    };
  }

  const visible = field.visibleWhen ? baseVisible && field.visibleWhen(formData) : baseVisible;
  const disabled = field.disabledWhen ? field.disabledWhen(formData) : false;
  const required = field.requiredWhen ? baseRequired || field.requiredWhen(formData) : baseRequired;

  if (!visible && field.clearWhenHidden) {
    return { name: field.name, visible, disabled, required, computedValue: null };
  }

  let computedValue = field.computed ? field.computed(formData) : undefined;

  if (computedValue === undefined && field.defaultWhen && isEmptyRuleValue(formData[field.name])) {
    computedValue = field.defaultWhen(formData);
  }

  return { name: field.name, visible, disabled, required, computedValue };
}

/**
 * Given the current Field definitions and live form data,
 * returns the reactive state (visible/disabled/required/computedValue) for each field.
 *
 * Pure computation — re-runs whenever formData changes.
 *
 * When `formData` is `null`, SmartCrud has not hydrated the form snapshot yet
 * (typically while opening an edit dialog), so rules are skipped and defaults
 * are returned. Empty objects `{}` are treated as valid create-form state.
 */
export function useConditionalRules(
  fields: Field[],
  formData: FormDataRecord | null,
): FieldState[] {
  return useMemo(() => {
    return fields.map((field) => evaluateConditionalRuleState(field, formData));
  }, [fields, formData]);
}
