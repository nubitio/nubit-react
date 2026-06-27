import type { FieldTypeModule } from './FieldTypeModule';

const REQUIRED_KEYS: (keyof FieldTypeModule)[] = [
  'defaultFilterOperator',
  'filterOperators',
  'buildFilterTerms',
  'cellText',
  'serializeFormValue',
  'serializeDetailValue',
  'ControlRender',
];

/**
 * Validates that a custom Field-Type module implements the full contract.
 * @throws Error when the module is incomplete.
 */
export function validateFieldTypeModule(type: string, module: FieldTypeModule): void {
  if (!type || typeof type !== 'string') {
    throw new Error('registerFieldType: type must be a non-empty string.');
  }

  for (const key of REQUIRED_KEYS) {
    const value = module[key];
    if (value === undefined || value === null) {
      throw new Error(`registerFieldType("${type}"): missing required "${String(key)}".`);
    }
  }

  if (!Array.isArray(module.filterOperators) || module.filterOperators.length === 0) {
    throw new Error(`registerFieldType("${type}"): filterOperators must be a non-empty array.`);
  }
}