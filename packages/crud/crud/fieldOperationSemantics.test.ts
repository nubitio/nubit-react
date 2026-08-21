import { describe, expect, it } from 'vitest';
import type { DataRecord } from '@nubitio/core';
import type { FieldDef } from '../field/Field';
import {
  applyFieldOperationFormSemantics,
  applyFieldOperationSemantics,
  collectOperationSemanticsIssues,
  normalizeFieldOperationSemantics,
  resolveFieldOperationSemantics,
  SmartCrudFieldOperationSemanticsError,
} from './fieldOperationSemantics';

const field = (overrides: Partial<FieldDef<DataRecord>> = {}): FieldDef<DataRecord> =>
  ({ name: 'name', label: 'Name', ...overrides }) as FieldDef<DataRecord>;

describe('normalizeFieldOperationSemantics', () => {
  it('leaves both operations unconstrained without a behavior', () => {
    expect(normalizeFieldOperationSemantics(undefined)).toEqual({ create: {}, edit: {} });
  });

  it('spreads a boolean flag across both operations', () => {
    expect(normalizeFieldOperationSemantics({ readonly: true })).toEqual({
      create: { readonly: true },
      edit: { readonly: true },
    });
  });

  it('applies a per-operation flag only where it is named', () => {
    expect(normalizeFieldOperationSemantics({ required: { create: true } })).toEqual({
      create: { required: true },
      edit: {},
    });
  });

  it('reads the per-operation state blocks', () => {
    expect(
      normalizeFieldOperationSemantics({
        create: { visible: true, required: true },
        edit: { readonly: true },
      }),
    ).toEqual({
      create: { visible: true, required: true },
      edit: { readonly: true },
    });
  });

  describe('only', () => {
    it('shows the field on the named operation and hides it on the other', () => {
      expect(normalizeFieldOperationSemantics({ only: 'create' })).toEqual({
        create: { visible: true },
        edit: { visible: false },
      });
    });

    it('accepts a list of operations', () => {
      expect(normalizeFieldOperationSemantics({ only: ['create', 'edit'] })).toEqual({
        create: { visible: true },
        edit: { visible: true },
      });
    });

    it('an empty list hides the field everywhere', () => {
      expect(normalizeFieldOperationSemantics({ only: [] })).toEqual({
        create: { visible: false },
        edit: { visible: false },
      });
    });
  });

  describe('contradictions', () => {
    it('rejects a flag that disagrees with only', () => {
      expect(() => normalizeFieldOperationSemantics({ only: 'create', visible: false })).toThrow(
        SmartCrudFieldOperationSemanticsError,
      );
    });

    it('rejects a state block that disagrees with a flag', () => {
      expect(() =>
        normalizeFieldOperationSemantics({ readonly: true, create: { readonly: false } }),
      ).toThrow(SmartCrudFieldOperationSemanticsError);
    });

    // A field the user cannot see cannot be one they must fill in.
    it('rejects requiring an invisible field, once per operation', () => {
      let thrown: SmartCrudFieldOperationSemanticsError | undefined;
      try {
        normalizeFieldOperationSemantics({ visible: false, required: true });
      } catch (error) {
        thrown = error as SmartCrudFieldOperationSemanticsError;
      }

      expect(thrown?.issues).toHaveLength(2);
      expect(thrown?.issues.every((issue) => issue.includes('cannot be required'))).toBe(true);
    });

    it('reports which operation and property clashed', () => {
      let thrown: SmartCrudFieldOperationSemanticsError | undefined;
      try {
        normalizeFieldOperationSemantics({ required: true, edit: { required: false } }, 'Field x');
      } catch (error) {
        thrown = error as SmartCrudFieldOperationSemanticsError;
      }

      expect(thrown?.name).toBe('SmartCrudFieldOperationSemanticsError');
      expect(thrown?.issues).toHaveLength(1);
      expect(thrown?.issues[0]).toContain('Field x');
      expect(thrown?.issues[0]).toContain('edit.required');
    });

    it('restating the same value is not a conflict', () => {
      expect(() =>
        normalizeFieldOperationSemantics({ readonly: true, create: { readonly: true } }),
      ).not.toThrow();
    });
  });
});

describe('collectOperationSemanticsIssues', () => {
  it('reports nothing for an absent or valid behavior', () => {
    expect(collectOperationSemanticsIssues('Field x', undefined)).toEqual([]);
    expect(collectOperationSemanticsIssues('Field x', { only: 'create' })).toEqual([]);
  });

  it('returns the same issues normalize would throw, without throwing', () => {
    const behavior = { visible: false, required: true } as const;

    const issues = collectOperationSemanticsIssues('Field x', behavior);

    expect(issues).not.toEqual([]);
    expect(() => normalizeFieldOperationSemantics(behavior, 'Field x')).toThrow(
      SmartCrudFieldOperationSemanticsError,
    );
  });

  it('collects several issues at once', () => {
    expect(collectOperationSemanticsIssues('Field x', { visible: false, required: true })).toEqual([
      'Field x cannot be required when create.visible is false.',
      'Field x cannot be required when edit.visible is false.',
    ]);
  });

  it('reports a flag that contradicts only', () => {
    const issues = collectOperationSemanticsIssues('Field x', { only: 'create', visible: false });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('create.visible');
  });
});

describe('resolveFieldOperationSemantics', () => {
  it('falls back to the field defaults when nothing is overridden', () => {
    const resolved = resolveFieldOperationSemantics({ required: true }, undefined);

    expect(resolved.create).toEqual({
      visible: true,
      required: true,
      readonly: false,
      disabled: false,
    });
    expect(resolved.edit).toEqual(resolved.create);
  });

  it('prefers visible over hidden when both are set', () => {
    expect(
      resolveFieldOperationSemantics({ visible: true, hidden: true }, undefined).create.visible,
    ).toBe(true);
  });

  it('derives visibility from hidden when visible is unset', () => {
    expect(resolveFieldOperationSemantics({ hidden: true }, undefined).create.visible).toBe(false);
  });

  it('treats a field with neither flag as visible', () => {
    expect(resolveFieldOperationSemantics({}, undefined).create.visible).toBe(true);
  });

  it('lets the behavior override the field default per operation', () => {
    const resolved = resolveFieldOperationSemantics(
      { readonly: false },
      { readonly: { edit: true } },
    );

    expect(resolved.create.readonly).toBe(false);
    expect(resolved.edit.readonly).toBe(true);
  });
});

describe('applyFieldOperationSemantics', () => {
  it('writes grid visibility and keeps hidden as its mirror', () => {
    const applied = applyFieldOperationSemantics(field(), 'edit', { only: 'create' });

    expect(applied.visible).toBe(false);
    expect(applied.hidden).toBe(true);
  });

  it('writes form visibility when targeting the form', () => {
    const applied = applyFieldOperationSemantics(
      field(),
      'create',
      { only: 'create' },
      'x',
      'form',
    );

    expect(applied.visibleOnForm).toBe(true);
    expect(applied.hidden).toBe(false);
    expect(applied).not.toHaveProperty('visible');
  });

  it('carries every other field property through untouched', () => {
    const applied = applyFieldOperationSemantics(field({ label: 'Nombre' }), 'create', undefined);

    expect(applied.name).toBe('name');
    expect(applied.label).toBe('Nombre');
  });

  it('projects the requested operation, not the other one', () => {
    const behavior = { required: { create: true, edit: false } } as const;

    expect(applyFieldOperationSemantics(field(), 'create', behavior).required).toBe(true);
    expect(applyFieldOperationSemantics(field(), 'edit', behavior).required).toBe(false);
  });

  it('names the field in the reported issues when the behavior contradicts itself', () => {
    let thrown: SmartCrudFieldOperationSemanticsError | undefined;
    try {
      applyFieldOperationSemantics(field({ name: 'price' }), 'create', {
        visible: false,
        required: true,
      });
    } catch (error) {
      thrown = error as SmartCrudFieldOperationSemanticsError;
    }

    expect(thrown?.issues[0]).toContain("Field 'price'");
  });

  it('the deprecated form helper matches the form target', () => {
    const behavior = { only: 'create' } as const;

    expect(applyFieldOperationFormSemantics(field(), 'edit', behavior)).toEqual(
      applyFieldOperationSemantics(field(), 'edit', behavior, "Field 'name'", 'form'),
    );
  });
});
