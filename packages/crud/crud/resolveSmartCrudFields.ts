import type { Field } from '../field/Field';
import {
  type SmartCrudHydraFieldContract,
  type SmartCrudFieldContract,
  type SmartCrudManualField,
  type SmartCrudFieldPatch,
  type SmartCrudRecord,
} from './fieldContract';
import {
  validateFieldContract,
  validateHydraFieldResolutionInput,
  validateResolvedFieldNames,
} from './fieldValidation';

export type FieldOverride = Partial<Field> & { key: string };

interface ResolveSmartCrudFieldsOptions<T extends SmartCrudRecord> {
  baselineFields?: readonly Field[];
  contract?: SmartCrudFieldContract<T>;
  legacyOverrides?: readonly FieldOverride[];
}

function cloneField<TField extends object>(field: TField): TField {
  return { ...field };
}

function applyFieldPatch(field: Field, patch: SmartCrudFieldPatch<SmartCrudRecord>): Field {
  return { ...field, ...patch } as Field;
}

function toResolvedManualField(field: SmartCrudManualField<SmartCrudRecord>): Field {
  return cloneField(field) as Field;
}

function resolveHydraFields<T extends SmartCrudRecord>(
  baselineFields: readonly Field[],
  contract: SmartCrudHydraFieldContract<T>,
): Field[] {
  validateHydraFieldResolutionInput(baselineFields, contract);
  const overrides = new Map<string, SmartCrudFieldPatch<SmartCrudRecord>>();
  const removals = new Set<string>();
  const prepend: Field[] = [];
  const append: Field[] = [];

  contract.directives.forEach((directive) => {
    if (directive.kind === 'override') {
      overrides.set(directive.key, directive.patch as SmartCrudFieldPatch<SmartCrudRecord>);
      return;
    }

    if (directive.kind === 'remove') {
      removals.add(directive.key);
      return;
    }

    const syntheticField = toResolvedManualField(
      directive.field as SmartCrudManualField<SmartCrudRecord>,
    );
    if (directive.kind === 'prepend') {
      prepend.push(syntheticField);
      return;
    }

    append.push(syntheticField);
  });

  const resolvedBaseline = baselineFields.flatMap((field) => {
    if (removals.has(field.name)) {
      return [];
    }

    const patch = overrides.get(field.name);
    return [patch ? applyFieldPatch(field, patch) : cloneField(field)];
  });

  const resolved = [...prepend, ...resolvedBaseline, ...append];
  validateResolvedFieldNames(resolved, 'Resolved SmartCrud');

  return resolved;
}

export function mergeOverrides(inferred: Field[], overrides: readonly FieldOverride[]): Field[] {
  return inferred.map((field) => {
    const override = overrides.find((entry) => entry.key === field.name);
    if (!override) {
      return cloneField(field);
    }

    const { key, ...overrideProps } = override;
    void key;
    return { ...field, ...overrideProps };
  });
}

export function resolveSmartCrudFields<T extends SmartCrudRecord>(
  options: ResolveSmartCrudFieldsOptions<T>,
): Field[] {
  const { baselineFields = [], contract, legacyOverrides = [] } = options;

  if (!contract) {
    return legacyOverrides.length > 0
      ? mergeOverrides([...baselineFields], legacyOverrides)
      : [...baselineFields].map(cloneField);
  }

  validateFieldContract(contract);

  if (contract.source === 'manual') {
    return contract.fields.map((field) =>
      toResolvedManualField(field as SmartCrudManualField<SmartCrudRecord>),
    );
  }

  return resolveHydraFields(baselineFields, contract);
}
