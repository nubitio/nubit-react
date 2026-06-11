import type { FieldDef } from '../field/Field';
import type { DataRecord } from '@nubitio/core';

export type SmartCrudOperation = 'create' | 'edit';
export type SmartCrudFieldOperation = SmartCrudOperation;
export type SmartCrudFieldOperationFlag =
  | boolean
  | Partial<Record<SmartCrudFieldOperation, boolean>>;

export interface SmartCrudFieldOperationState {
  visible?: boolean;
  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
}

export interface SmartCrudFieldOperationBehavior {
  only?: SmartCrudFieldOperation | readonly SmartCrudFieldOperation[];
  visible?: SmartCrudFieldOperationFlag;
  required?: SmartCrudFieldOperationFlag;
  readonly?: SmartCrudFieldOperationFlag;
  disabled?: SmartCrudFieldOperationFlag;
  create?: SmartCrudFieldOperationState;
  edit?: SmartCrudFieldOperationState;
}

export interface SmartCrudResolvedFieldOperationState {
  visible: boolean;
  required: boolean;
  readonly: boolean;
  disabled: boolean;
}

export type SmartCrudResolvedFieldOperationSemantics = Record<
  SmartCrudFieldOperation,
  SmartCrudResolvedFieldOperationState
>;
export type SmartCrudNormalizedFieldOperationSemantics = Record<
  SmartCrudFieldOperation,
  SmartCrudFieldOperationState
>;

export class SmartCrudFieldOperationSemanticsError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'SmartCrudFieldOperationSemanticsError';
    this.issues = issues;
  }
}

type SmartCrudPartialOperationSemantics = SmartCrudNormalizedFieldOperationSemantics;
type SmartCrudOperationProperty = keyof SmartCrudFieldOperationState;

const OPERATIONS: readonly SmartCrudFieldOperation[] = ['create', 'edit'];
const PROPERTIES: readonly SmartCrudOperationProperty[] = [
  'visible',
  'required',
  'readonly',
  'disabled',
];

type SmartCrudFieldOperationDefaults = Pick<
  FieldDef<DataRecord>,
  'visible' | 'hidden' | 'required' | 'readonly' | 'disabled'
>;

function normalizeOnly(
  only: SmartCrudFieldOperationBehavior['only'],
): readonly SmartCrudFieldOperation[] | undefined {
  if (!only) {
    return undefined;
  }

  return (Array.isArray(only) ? only : [only]) as readonly SmartCrudFieldOperation[];
}

function createEmptySemantics(): SmartCrudPartialOperationSemantics {
  return {
    create: {},
    edit: {},
  };
}

function applyProperty(
  target: SmartCrudPartialOperationSemantics,
  issues: string[],
  owner: string,
  operation: SmartCrudFieldOperation,
  property: SmartCrudOperationProperty,
  value: boolean,
  source: string,
): void {
  const current = target[operation][property];

  if (current !== undefined && current !== value) {
    issues.push(
      `${owner} defines conflicting ${operation}.${property} semantics (${String(current)} vs ${String(value)} from ${source}).`,
    );
    return;
  }

  target[operation][property] = value;
}

function applyFlagInput(
  target: SmartCrudPartialOperationSemantics,
  issues: string[],
  owner: string,
  property: SmartCrudOperationProperty,
  input: SmartCrudFieldOperationFlag | undefined,
): void {
  if (input === undefined) {
    return;
  }

  if (typeof input === 'boolean') {
    OPERATIONS.forEach((operation) => {
      applyProperty(target, issues, owner, operation, property, input, property);
    });
    return;
  }

  OPERATIONS.forEach((operation) => {
    const value = input[operation];

    if (value === undefined) {
      return;
    }

    applyProperty(target, issues, owner, operation, property, value, `${property}.${operation}`);
  });
}

function applyStateInput(
  target: SmartCrudPartialOperationSemantics,
  issues: string[],
  owner: string,
  operation: SmartCrudFieldOperation,
  state: SmartCrudFieldOperationState | undefined,
): void {
  if (!state) {
    return;
  }

  PROPERTIES.forEach((property) => {
    const value = state[property];

    if (value === undefined) {
      return;
    }

    applyProperty(target, issues, owner, operation, property, value, `${operation}.${property}`);
  });
}

function validateResolvedSemantics(
  owner: string,
  semantics: SmartCrudPartialOperationSemantics,
): string[] {
  const issues: string[] = [];

  OPERATIONS.forEach((operation) => {
    const state = semantics[operation];

    if (state.visible === false && state.required === true) {
      issues.push(`${owner} cannot be required when ${operation}.visible is false.`);
    }
  });

  return issues;
}

export function normalizeFieldOperationSemantics(
  behavior: SmartCrudFieldOperationBehavior | undefined,
  owner = 'Field operation semantics',
): SmartCrudNormalizedFieldOperationSemantics {
  const semantics = createEmptySemantics();

  if (!behavior) {
    return semantics;
  }

  const issues: string[] = [];
  const allowedOperations = normalizeOnly(behavior.only);

  if (allowedOperations) {
    const allowedOperationSet = new Set(allowedOperations);

    OPERATIONS.forEach((operation) => {
      applyProperty(
        semantics,
        issues,
        owner,
        operation,
        'visible',
        allowedOperationSet.has(operation),
        'only',
      );
    });
  }

  applyFlagInput(semantics, issues, owner, 'visible', behavior.visible);
  applyFlagInput(semantics, issues, owner, 'required', behavior.required);
  applyFlagInput(semantics, issues, owner, 'readonly', behavior.readonly);
  applyFlagInput(semantics, issues, owner, 'disabled', behavior.disabled);
  applyStateInput(semantics, issues, owner, 'create', behavior.create);
  applyStateInput(semantics, issues, owner, 'edit', behavior.edit);

  issues.push(...validateResolvedSemantics(owner, semantics));

  if (issues.length > 0) {
    throw new SmartCrudFieldOperationSemanticsError(
      'Invalid SmartCrud field operation semantics.',
      issues,
    );
  }

  return semantics;
}

/**
 * Validates field operation semantics and returns any issues found,
 * without throwing. Uses the same validation logic as
 * `normalizeFieldOperationSemantics` but collects issues instead of
 * throwing `SmartCrudFieldOperationSemanticsError`.
 */
export function collectOperationSemanticsIssues(
  owner: string,
  behavior: SmartCrudFieldOperationBehavior | undefined,
): string[] {
  if (!behavior) return [];

  const semantics = createEmptySemantics();
  const issues: string[] = [];
  const allowedOperations = normalizeOnly(behavior.only);

  if (allowedOperations) {
    const allowedOperationSet = new Set(allowedOperations);
    OPERATIONS.forEach((operation) => {
      applyProperty(semantics, issues, owner, operation, 'visible', allowedOperationSet.has(operation), 'only');
    });
  }

  applyFlagInput(semantics, issues, owner, 'visible', behavior.visible);
  applyFlagInput(semantics, issues, owner, 'required', behavior.required);
  applyFlagInput(semantics, issues, owner, 'readonly', behavior.readonly);
  applyFlagInput(semantics, issues, owner, 'disabled', behavior.disabled);
  applyStateInput(semantics, issues, owner, 'create', behavior.create);
  applyStateInput(semantics, issues, owner, 'edit', behavior.edit);

  issues.push(...validateResolvedSemantics(owner, semantics));
  return issues;
}

function resolveBaseVisibility(field: Partial<SmartCrudFieldOperationDefaults>): boolean {
  if (field.visible !== undefined) {
    return field.visible;
  }

  if (field.hidden !== undefined) {
    return !field.hidden;
  }

  return true;
}

function resolveBaseState(
  field: Partial<SmartCrudFieldOperationDefaults>,
): SmartCrudResolvedFieldOperationState {
  return {
    visible: resolveBaseVisibility(field),
    required: field.required ?? false,
    readonly: field.readonly ?? false,
    disabled: field.disabled ?? false,
  };
}

export function resolveFieldOperationSemantics(
  field: Partial<SmartCrudFieldOperationDefaults>,
  behavior: SmartCrudFieldOperationBehavior | undefined,
  owner = 'Field operation semantics',
): SmartCrudResolvedFieldOperationSemantics {
  const normalized = normalizeFieldOperationSemantics(behavior, owner);

  return OPERATIONS.reduce<SmartCrudResolvedFieldOperationSemantics>((resolved, operation) => {
    const baseState = resolveBaseState(field);
    resolved[operation] = {
      visible: normalized[operation].visible ?? baseState.visible,
      required: normalized[operation].required ?? baseState.required,
      readonly: normalized[operation].readonly ?? baseState.readonly,
      disabled: normalized[operation].disabled ?? baseState.disabled,
    };
    return resolved;
  }, {} as SmartCrudResolvedFieldOperationSemantics);
}

export function applyFieldOperationSemantics<T extends DataRecord>(
  field: FieldDef<T>,
  operation: SmartCrudFieldOperation,
  behavior: SmartCrudFieldOperationBehavior | undefined,
  owner = `Field '${field.name}'`,
  target: 'grid' | 'form' = 'grid',
): FieldDef<T> {
  const resolved = resolveFieldOperationSemantics(field, behavior, owner)[operation];

  return {
    ...field,
    ...(target === 'form'
      ? { visibleOnForm: resolved.visible }
      : { visible: resolved.visible }),
    hidden: !resolved.visible,
    required: resolved.required,
    readonly: resolved.readonly,
    disabled: resolved.disabled,
  };
}

/** @deprecated Use `applyFieldOperationSemantics` with `target: 'form'` instead. */
export function applyFieldOperationFormSemantics<T extends DataRecord>(
  field: FieldDef<T>,
  operation: SmartCrudFieldOperation,
  behavior: SmartCrudFieldOperationBehavior | undefined,
  owner = `Field '${field.name}'`,
): FieldDef<T> {
  return applyFieldOperationSemantics(field, operation, behavior, owner, 'form');
}
