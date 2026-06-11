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

type CustomRule = {
  type: 'custom';
  options: { validationCallback: (value: unknown) => boolean; message?: string };
};

type AsyncRule = {
  type: 'async';
  options: { validationCallback: (value: unknown) => Promise<boolean>; message?: string };
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
