type RequiredRule = {
  type: 'required';
  options: { message?: string };
};

type EmailRule = {
  type: 'email';
  options: { message?: string };
};

type NumericRule = {
  type: 'numeric';
  options: { message?: string };
};

type PatternRule = {
  type: 'pattern';
  options: { pattern: string; message?: string };
};

type StringLengthRule = {
  type: 'stringLength';
  options: { min?: number; max?: number; message?: string };
};

type RangeRule = {
  type: 'range';
  options: { min?: number; max?: number; message?: string };
};

type CompareRule = {
  type: 'compare';
  options: {
    comparisonTarget: () => unknown;
    comparisonType?: '==' | '!=' | '>' | '<' | '>=' | '<=';
    message?: string;
  };
};

/**
 * What the form engine actually passes to custom/async callbacks
 * (NativeFormView calls `validationCallback({ value, data })`).
 */
export interface ValidationCallbackContext {
  /** Current value of the field being validated. */
  value: unknown;
  /** Full form data snapshot, for cross-field rules. */
  data: Record<string, unknown>;
}

type CustomRule = {
  type: 'custom';
  options: { validationCallback: (ctx: ValidationCallbackContext) => boolean; message?: string };
};

type AsyncRule = {
  type: 'async';
  options: {
    validationCallback: (ctx: ValidationCallbackContext) => Promise<boolean>;
    message?: string;
  };
};

export type ValidationRule =
  | RequiredRule
  | EmailRule
  | NumericRule
  | PatternRule
  | StringLengthRule
  | RangeRule
  | CompareRule
  | CustomRule
  | AsyncRule;
