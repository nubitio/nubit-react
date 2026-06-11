import type { Field } from '../field/Field';
import {
  collectOperationSemanticsIssues,
  type SmartCrudFieldOperationBehavior,
} from './fieldOperationSemantics';
import type { DataRecord } from '@nubitio/core';

type SmartCrudRecord = object;

type SmartCrudHydraDirectiveLike<T extends SmartCrudRecord> =
  | { kind: 'override'; key: Extract<keyof T, string>; patch: SmartCrudFieldPatchLike }
  | { kind: 'remove'; key: Extract<keyof T, string> }
  | { kind: 'prepend'; field: SmartCrudManualFieldLike }
  | { kind: 'append'; field: SmartCrudManualFieldLike };

type SmartCrudFieldContractLike<T extends SmartCrudRecord> =
  | {
      source: 'hydra';
      strategy: 'augment';
      directives: readonly SmartCrudHydraDirectiveLike<T>[];
    }
  | {
      source: 'manual';
      strategy: 'replace';
      fields: readonly SmartCrudManualFieldLike[];
    };

export class SmartCrudFieldContractError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'SmartCrudFieldContractError';
    this.issues = issues;
  }
}

const CONTRACT_KEYS = ['source', 'strategy'] as const;
const HYDRA_CONTRACT_KEYS = [...CONTRACT_KEYS, 'directives'] as const;
const MANUAL_CONTRACT_KEYS = [...CONTRACT_KEYS, 'fields'] as const;
const OVERRIDE_DIRECTIVE_KEYS = ['kind', 'key', 'patch'] as const;
const REMOVE_DIRECTIVE_KEYS = ['kind', 'key'] as const;
const SYNTHETIC_DIRECTIVE_KEYS = ['kind', 'field'] as const;
const OPERATION_BEHAVIOR_KEYS = [
  'only',
  'visible',
  'required',
  'readonly',
  'disabled',
  'create',
  'edit',
] as const;
const OPERATION_STATE_KEYS = ['visible', 'required', 'readonly', 'disabled'] as const;
const FIELD_KEYS = [
  'isIdentity',
  'type',
  'col',
  'name',
  'label',
  'width',
  'height',
  'minWidth',
  'align',
  'sortable',
  'filterable',
  'hideable',
  'validators',
  'url',
  'loadOptions',
  'filters',
  'byKeyUrl',
  'textField',
  'valueField',
  'valueType',
  'format',
  'selectedFilterOperation',
  'filterValue',
  'data',
  'formatter',
  'itemFormatter',
  'visible',
  'defaultValue',
  'autoSelectIfSingle',
  'onChange',
  'onSelect',
  'onClick',
  'readonly',
  'disabled',
  'hidden',
  'required',
  'precision',
  'accept',
  'buttons',
  'searchEnabled',
  'searchExpr',
  'helpText',
  'contentRender',
  'visibleOnForm',
  'maxLength',
  'multiple',
  'sendAsString',
  'order',
  'layoutHint',
  'preferredColSpan',
  'minColSpan',
  'forceFullWidth',
  'visibleWhen',
  'disabledWhen',
  'computed',
  'defaultWhen',
  'requiredWhen',
  'clearWhenHidden',
  'dependsOn',
  'permissions',
] as const;

type SmartCrudFieldShape = Partial<Record<(typeof FIELD_KEYS)[number], unknown>>;

type SmartCrudFieldPatchLike = SmartCrudFieldShape & {
  operation?: SmartCrudFieldOperationBehavior;
};

type SmartCrudManualFieldLike = SmartCrudFieldShape & {
  name: string;
  operation?: SmartCrudFieldOperationBehavior;
};
const MANUAL_FIELD_KEYS = [...FIELD_KEYS, 'operation'] as const;
const FIELD_PATCH_KEYS = MANUAL_FIELD_KEYS.filter((key) => key !== 'name');

function normalizeKey(value: string): string {
  return value.trim();
}

function isPlainObject(value: unknown): value is DataRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatAllowedKeys(keys: readonly string[]): string {
  return keys.join(', ');
}

function collectUnknownKeyIssues(
  owner: string,
  value: unknown,
  allowedKeys: readonly string[],
): string[] {
  if (!isPlainObject(value)) {
    return [`${owner} must be an object.`];
  }

  return Object.keys(value)
    .filter((key) => !allowedKeys.includes(key))
    .sort((left, right) => left.localeCompare(right))
    .map(
      (key) =>
        `${owner} contains unknown key '${key}'. Allowed keys: ${formatAllowedKeys(allowedKeys)}.`,
    );
}

function collectOperationBehaviorIssues(
  owner: string,
  behavior: SmartCrudFieldOperationBehavior | undefined,
): string[] {
  if (behavior === undefined) {
    return [];
  }

  const issues = collectUnknownKeyIssues(`${owner} operation`, behavior, OPERATION_BEHAVIOR_KEYS);
  if (isPlainObject(behavior)) {
    if (behavior.create !== undefined) {
      issues.push(
        ...collectUnknownKeyIssues(
          `${owner} operation.create`,
          behavior.create,
          OPERATION_STATE_KEYS,
        ),
      );
    }

    if (behavior.edit !== undefined) {
      issues.push(
        ...collectUnknownKeyIssues(`${owner} operation.edit`, behavior.edit, OPERATION_STATE_KEYS),
      );
    }
  }

  issues.push(...collectOperationSemanticsIssues(owner, behavior));
  return issues;
}

function collectHydraFieldDirectiveIssues<T extends SmartCrudRecord>(
  directive: SmartCrudHydraDirectiveLike<T>,
  index: number,
): string[] {
  const owner = `Directive #${index + 1}`;

  if (directive.kind === 'override') {
    return [
      ...collectUnknownKeyIssues(owner, directive, OVERRIDE_DIRECTIVE_KEYS),
      ...collectUnknownKeyIssues(
        `Override '${normalizeKey(String(directive.key ?? ''))}' patch`,
        directive.patch,
        FIELD_PATCH_KEYS,
      ),
      ...collectOperationBehaviorIssues(
        `Override '${normalizeKey(String(directive.key ?? ''))}'`,
        directive.patch.operation,
      ),
    ];
  }

  if (directive.kind === 'remove') {
    return collectUnknownKeyIssues(owner, directive, REMOVE_DIRECTIVE_KEYS);
  }

  const fieldName = normalizeKey(directive.field?.name ?? '');
  return [
    ...collectUnknownKeyIssues(owner, directive, SYNTHETIC_DIRECTIVE_KEYS),
    ...collectUnknownKeyIssues(
      `Synthetic field '${fieldName || `#${index + 1}`}'`,
      directive.field,
      MANUAL_FIELD_KEYS,
    ),
    ...collectOperationBehaviorIssues(
      `Synthetic field '${fieldName || `#${index + 1}`}'`,
      directive.field.operation,
    ),
  ];
}

function collectManualFieldIssues(field: SmartCrudManualFieldLike, index: number): string[] {
  const fieldName = normalizeKey(field.name ?? '');

  return [
    ...collectUnknownKeyIssues(`Manual field #${index + 1}`, field, MANUAL_FIELD_KEYS),
    ...collectOperationBehaviorIssues(
      `Manual field '${fieldName || `#${index + 1}`}'`,
      field.operation,
    ),
  ];
}

export function validateFieldContract<T extends SmartCrudRecord>(
  contract: SmartCrudFieldContractLike<T>,
): SmartCrudFieldContractLike<T> {
  const issues: string[] = [];

  if (contract.source === 'hydra') {
    issues.push(...collectUnknownKeyIssues('Hydra contract', contract, HYDRA_CONTRACT_KEYS));

    if (contract.strategy !== 'augment') {
      issues.push("Hydra contracts must use strategy 'augment'.");
    }

    const targetedKeys = new Map<string, SmartCrudHydraDirectiveLike<T>['kind']>();
    const syntheticNames = new Set<string>();

    contract.directives.forEach((directive, index) => {
      issues.push(...collectHydraFieldDirectiveIssues(directive, index));

      if (directive.kind === 'override' || directive.kind === 'remove') {
        const key = normalizeKey(directive.key);

        if (!key) {
          issues.push(`Directive #${index + 1} must reference a non-empty field key.`);
          return;
        }

        const previous = targetedKeys.get(key);
        if (previous) {
          issues.push(
            `Field '${key}' is targeted more than once in hydra directives (${previous} + ${directive.kind}).`,
          );
        } else {
          targetedKeys.set(key, directive.kind);
        }

        return;
      }

      const fieldName = normalizeKey(directive.field.name);
      if (!fieldName) {
        issues.push(`Directive #${index + 1} must define a non-empty synthetic field name.`);
        return;
      }

      if (syntheticNames.has(fieldName)) {
        issues.push(`Synthetic field '${fieldName}' is declared more than once.`);
      } else {
        syntheticNames.add(fieldName);
      }
    });
  }

  if (contract.source === 'manual') {
    issues.push(...collectUnknownKeyIssues('Manual contract', contract, MANUAL_CONTRACT_KEYS));

    if (contract.strategy !== 'replace') {
      issues.push("Manual contracts must use strategy 'replace'.");
    }

    const names = new Set<string>();

    contract.fields.forEach((field, index) => {
      issues.push(...collectManualFieldIssues(field, index));

      const fieldName = normalizeKey(field.name);

      if (!fieldName) {
        issues.push(`Manual field #${index + 1} must define a non-empty name.`);
        return;
      }

      if (names.has(fieldName)) {
        issues.push(`Manual field '${fieldName}' is declared more than once.`);
      } else {
        names.add(fieldName);
      }
    });
  }

  if (issues.length > 0) {
    throw new SmartCrudFieldContractError('Invalid SmartCrud field contract.', issues);
  }

  return contract;
}

function validateUniqueFieldNames(fields: readonly Field[], owner: string): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  fields.forEach((field, index) => {
    const name = field.name.trim();

    if (!name) {
      duplicates.push(`${owner} field #${index + 1} must define a non-empty name.`);
      return;
    }

    if (seen.has(name)) {
      duplicates.push(`${owner} field '${name}' is declared more than once.`);
      return;
    }

    seen.add(name);
  });

  if (duplicates.length > 0) {
    throw new SmartCrudFieldContractError('Invalid SmartCrud field resolution input.', duplicates);
  }
}

export function validateHydraFieldResolutionInput<T extends SmartCrudRecord>(
  baselineFields: readonly Field[],
  contract: Extract<SmartCrudFieldContractLike<T>, { source: 'hydra' }>,
): void {
  validateUniqueFieldNames(baselineFields, 'Hydra baseline');

  const baselineByName = new Map(baselineFields.map((field) => [field.name, field]));
  const issues: string[] = [];

  contract.directives.forEach((directive) => {
    if (directive.kind === 'override' || directive.kind === 'remove') {
      if (!baselineByName.has(directive.key)) {
        issues.push(
          `${directive.kind === 'override' ? 'Override' : 'Remove'} targets unknown Hydra field '${directive.key}'.`,
        );
      }

      return;
    }

    const syntheticName = normalizeKey(directive.field.name);
    if (baselineByName.has(syntheticName)) {
      issues.push(
        `Synthetic field '${syntheticName}' collides with an inferred Hydra field. Use 'override' instead.`,
      );
    }
  });

  if (issues.length > 0) {
    throw new SmartCrudFieldContractError('Invalid SmartCrud hydra field resolution.', issues);
  }
}

export function validateResolvedFieldNames(fields: readonly Field[], owner: string): void {
  validateUniqueFieldNames(fields, owner);
}
