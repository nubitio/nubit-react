import { describe, expect, it } from 'vitest';
import type { Field } from '../field/Field';
import {
  SmartCrudFieldContractError,
  validateFieldContract,
  validateHydraFieldResolutionInput,
  validateResolvedFieldNames,
} from './fieldValidation';

const gridField = (name: string): Field => ({ name, label: name }) as Field;

/** Runs the validator and hands back the issues it refused with. */
const issuesFrom = (run: () => unknown): string[] => {
  try {
    run();
  } catch (error) {
    return (error as SmartCrudFieldContractError).issues;
  }
  throw new Error('expected the contract to be rejected');
};

const hydra = (directives: unknown[]) =>
  ({ source: 'hydra', strategy: 'augment', directives }) as never;

const manual = (fields: unknown[]) => ({ source: 'manual', strategy: 'replace', fields }) as never;

describe('validateFieldContract — hydra', () => {
  it('accepts a contract and returns it unchanged', () => {
    const contract = hydra([{ kind: 'remove', key: 'secret' }]);

    expect(validateFieldContract(contract)).toBe(contract);
  });

  it('accepts override, remove and both synthetic directives together', () => {
    expect(() =>
      validateFieldContract(
        hydra([
          { kind: 'override', key: 'name', patch: { label: 'Nombre' } },
          { kind: 'remove', key: 'secret' },
          { kind: 'prepend', field: { name: 'first' } },
          { kind: 'append', field: { name: 'last' } },
        ]),
      ),
    ).not.toThrow();
  });

  it('rejects a strategy other than augment', () => {
    const issues = issuesFrom(() =>
      validateFieldContract({ source: 'hydra', strategy: 'replace', directives: [] } as never),
    );

    expect(issues).toContain("Hydra contracts must use strategy 'augment'.");
  });

  it('names an unknown top-level key and lists what is allowed', () => {
    const issues = issuesFrom(() =>
      validateFieldContract({
        source: 'hydra',
        strategy: 'augment',
        directives: [],
        fields: [],
      } as never),
    );

    expect(issues[0]).toContain("unknown key 'fields'");
    expect(issues[0]).toContain('directives');
  });

  it('rejects two directives targeting the same field', () => {
    const issues = issuesFrom(() =>
      validateFieldContract(
        hydra([
          { kind: 'override', key: 'name', patch: {} },
          { kind: 'remove', key: 'name' },
        ]),
      ),
    );

    expect(issues).toContain(
      "Field 'name' is targeted more than once in hydra directives (override + remove).",
    );
  });

  it('rejects an empty target key', () => {
    const issues = issuesFrom(() => validateFieldContract(hydra([{ kind: 'remove', key: '  ' }])));

    expect(issues).toContain('Directive #1 must reference a non-empty field key.');
  });

  it('rejects two synthetic fields with the same name', () => {
    const issues = issuesFrom(() =>
      validateFieldContract(
        hydra([
          { kind: 'append', field: { name: 'total' } },
          { kind: 'append', field: { name: 'total' } },
        ]),
      ),
    );

    expect(issues).toContain("Synthetic field 'total' is declared more than once.");
  });

  it('rejects a synthetic field without a name', () => {
    const issues = issuesFrom(() =>
      validateFieldContract(hydra([{ kind: 'prepend', field: { name: '' } }])),
    );

    expect(issues).toContain('Directive #1 must define a non-empty synthetic field name.');
  });

  it('rejects an unknown key inside an override patch', () => {
    const issues = issuesFrom(() =>
      validateFieldContract(hydra([{ kind: 'override', key: 'name', patch: { lable: 'typo' } }])),
    );

    expect(issues.some((issue) => issue.includes("unknown key 'lable'"))).toBe(true);
  });

  it('surfaces contradictory operation semantics from inside a patch', () => {
    const issues = issuesFrom(() =>
      validateFieldContract(
        hydra([
          {
            kind: 'override',
            key: 'name',
            patch: { operation: { visible: false, required: true } },
          },
        ]),
      ),
    );

    expect(issues.some((issue) => issue.includes('cannot be required'))).toBe(true);
  });

  it('rejects an unknown key inside operation.create', () => {
    const issues = issuesFrom(() =>
      validateFieldContract(
        hydra([
          {
            kind: 'override',
            key: 'name',
            patch: { operation: { create: { visable: true } } },
          },
        ]),
      ),
    );

    expect(issues.some((issue) => issue.includes("unknown key 'visable'"))).toBe(true);
  });

  it('reports every issue rather than stopping at the first', () => {
    const issues = issuesFrom(() =>
      validateFieldContract({
        source: 'hydra',
        strategy: 'replace',
        directives: [{ kind: 'append', field: { name: '' } }],
        extra: 1,
      } as never),
    );

    expect(issues.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateFieldContract — manual', () => {
  it('accepts a well-formed contract', () => {
    expect(() => validateFieldContract(manual([{ name: 'name' }]))).not.toThrow();
  });

  it('rejects a strategy other than replace', () => {
    const issues = issuesFrom(() =>
      validateFieldContract({ source: 'manual', strategy: 'augment', fields: [] } as never),
    );

    expect(issues).toContain("Manual contracts must use strategy 'replace'.");
  });

  it('rejects duplicate field names', () => {
    const issues = issuesFrom(() =>
      validateFieldContract(manual([{ name: 'name' }, { name: 'name' }])),
    );

    expect(issues).toContain("Manual field 'name' is declared more than once.");
  });

  it('rejects a field without a name', () => {
    const issues = issuesFrom(() => validateFieldContract(manual([{ name: '   ' }])));

    expect(issues).toContain('Manual field #1 must define a non-empty name.');
  });

  it('rejects an unknown key on a field', () => {
    const issues = issuesFrom(() =>
      validateFieldContract(manual([{ name: 'name', sortible: true }])),
    );

    expect(issues.some((issue) => issue.includes("unknown key 'sortible'"))).toBe(true);
  });

  it('carries the error name so callers can recognise it', () => {
    try {
      validateFieldContract(manual([{ name: '' }]));
    } catch (error) {
      expect(error).toBeInstanceOf(SmartCrudFieldContractError);
      expect((error as Error).name).toBe('SmartCrudFieldContractError');
    }
  });
});

describe('validateHydraFieldResolutionInput', () => {
  const baseline = [gridField('id'), gridField('name')];

  it('accepts directives that target known fields', () => {
    expect(() =>
      validateHydraFieldResolutionInput(
        baseline,
        hydra([
          { kind: 'override', key: 'name', patch: {} },
          { kind: 'append', field: { name: 'total' } },
        ]),
      ),
    ).not.toThrow();
  });

  it('rejects an override of a field the API never published', () => {
    const issues = issuesFrom(() =>
      validateHydraFieldResolutionInput(
        baseline,
        hydra([{ kind: 'override', key: 'ghost', patch: {} }]),
      ),
    );

    expect(issues).toContain("Override targets unknown Hydra field 'ghost'.");
  });

  it('rejects a remove of an unknown field', () => {
    const issues = issuesFrom(() =>
      validateHydraFieldResolutionInput(baseline, hydra([{ kind: 'remove', key: 'ghost' }])),
    );

    expect(issues).toContain("Remove targets unknown Hydra field 'ghost'.");
  });

  // Adding a field that already exists is an override in disguise, and the
  // message says so rather than letting one silently shadow the other.
  it('rejects a synthetic field colliding with an inferred one', () => {
    const issues = issuesFrom(() =>
      validateHydraFieldResolutionInput(
        baseline,
        hydra([{ kind: 'append', field: { name: 'name' } }]),
      ),
    );

    expect(issues[0]).toContain('collides with an inferred Hydra field');
    expect(issues[0]).toContain("Use 'override' instead");
  });

  it('rejects a baseline that already contains duplicates', () => {
    const issues = issuesFrom(() =>
      validateHydraFieldResolutionInput([gridField('name'), gridField('name')], hydra([])),
    );

    expect(issues).toContain("Hydra baseline field 'name' is declared more than once.");
  });

  it('rejects a baseline field with a blank name', () => {
    const issues = issuesFrom(() =>
      validateHydraFieldResolutionInput([gridField('  ')], hydra([])),
    );

    expect(issues).toContain('Hydra baseline field #1 must define a non-empty name.');
  });
});

describe('validateResolvedFieldNames', () => {
  it('accepts a unique set', () => {
    expect(() =>
      validateResolvedFieldNames([gridField('id'), gridField('name')], 'Resolved'),
    ).not.toThrow();
  });

  it('reports duplicates under the caller-supplied owner', () => {
    const issues = issuesFrom(() =>
      validateResolvedFieldNames([gridField('id'), gridField('id')], 'Resolved'),
    );

    expect(issues).toContain("Resolved field 'id' is declared more than once.");
  });

  it('ignores surrounding whitespace when comparing names', () => {
    const issues = issuesFrom(() =>
      validateResolvedFieldNames([gridField('id'), gridField(' id ')], 'Resolved'),
    );

    expect(issues).toHaveLength(1);
  });
});
