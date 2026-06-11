import type { FieldDef } from '../field/Field';
import type { SmartCrudFieldOperationBehavior } from './fieldOperationSemantics';
import type { DataRecord } from '@nubitio/core';
export { SmartCrudFieldContractError, validateFieldContract } from './fieldValidation';
import { validateFieldContract } from './fieldValidation';

export type {
  SmartCrudFieldOperation,
  SmartCrudFieldOperationBehavior,
  SmartCrudFieldOperationState,
  SmartCrudOperation,
} from './fieldOperationSemantics';

export type SmartCrudRecord = DataRecord;
export type SmartCrudModelFieldKey<T extends SmartCrudRecord> = Extract<keyof T, string>;
type SmartCrudFieldRecord<T extends SmartCrudRecord> = T & DataRecord;
export type SmartCrudFieldSourceMode = 'hydra' | 'manual';
export type SmartCrudFieldResolutionStrategy = 'augment' | 'replace';

export type SmartCrudFieldPatch<T extends SmartCrudRecord> = Partial<
  Omit<
    FieldDef<SmartCrudFieldRecord<T>>,
    'name' | 'defaultValue' | 'onChange' | 'required' | 'readonly' | 'disabled'
  >
> & {
  defaultValue?: FieldDef<SmartCrudFieldRecord<T>>['defaultValue'];
  onChange?: FieldDef<SmartCrudFieldRecord<T>>['onChange'];
  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  operation?: SmartCrudFieldOperationBehavior;
};

export type SmartCrudManualField<T extends SmartCrudRecord, Name extends string = string> = Omit<
  FieldDef<SmartCrudFieldRecord<T>>,
  'name' | 'defaultValue' | 'onChange' | 'required' | 'readonly' | 'disabled'
> & {
  name: Name;
  defaultValue?: FieldDef<SmartCrudFieldRecord<T>>['defaultValue'];
  onChange?: FieldDef<SmartCrudFieldRecord<T>>['onChange'];
  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  operation?: SmartCrudFieldOperationBehavior;
};

export interface SmartCrudOverrideField<
  T extends SmartCrudRecord,
  Key extends SmartCrudModelFieldKey<T> = SmartCrudModelFieldKey<T>,
> {
  kind: 'override';
  key: Key;
  patch: SmartCrudFieldPatch<T>;
}

export interface SmartCrudRemoveField<
  T extends SmartCrudRecord,
  Key extends SmartCrudModelFieldKey<T> = SmartCrudModelFieldKey<T>,
> {
  kind: 'remove';
  key: Key;
}

export interface SmartCrudPrependField<T extends SmartCrudRecord, Name extends string = string> {
  kind: 'prepend';
  field: SmartCrudManualField<T, Name>;
}

export interface SmartCrudAppendField<T extends SmartCrudRecord, Name extends string = string> {
  kind: 'append';
  field: SmartCrudManualField<T, Name>;
}

export type SmartCrudHydraFieldDirective<T extends SmartCrudRecord> =
  | SmartCrudOverrideField<T>
  | SmartCrudRemoveField<T>
  | SmartCrudPrependField<T>
  | SmartCrudAppendField<T>;

export interface SmartCrudHydraFieldContract<T extends SmartCrudRecord> {
  source: 'hydra';
  strategy: 'augment';
  directives: readonly SmartCrudHydraFieldDirective<T>[];
}

export interface SmartCrudManualFieldContract<T extends SmartCrudRecord> {
  source: 'manual';
  strategy: 'replace';
  fields: readonly SmartCrudManualField<T>[];
}

export type SmartCrudFieldContract<T extends SmartCrudRecord> =
  | SmartCrudHydraFieldContract<T>
  | SmartCrudManualFieldContract<T>;

export function defineFields<T extends SmartCrudRecord>(
  contract: SmartCrudHydraFieldContract<T>,
): SmartCrudHydraFieldContract<T>;
export function defineFields<T extends SmartCrudRecord>(
  contract: SmartCrudManualFieldContract<T>,
): SmartCrudManualFieldContract<T>;
export function defineFields<T extends SmartCrudRecord>(
  contract: SmartCrudFieldContract<T>,
): SmartCrudFieldContract<T> {
  return validateFieldContract(contract) as SmartCrudFieldContract<T>;
}

export const defineFieldContract = defineFields;
