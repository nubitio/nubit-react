/**
 * Role-driven field visibility — a UI affordance, not a security boundary.
 *
 * The backend decides what is allowed; this decides what is offered. The tests
 * below pin that distinction as much as the filtering itself, because the one
 * way this hook can do real damage is by being mistaken for authorization.
 */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFieldPermissions } from './useFieldPermissions';
import { identityField, textField } from '../../field/FieldBuilders';
import type { Field } from '../../field/Field';

function field(name: string, permissions?: Field['permissions']): Field {
  return { ...textField().name(name).label(name).build(), permissions };
}

const run = (fields: Field[], roles: string[]) =>
  renderHook(() => useFieldPermissions(fields, roles)).result.current;

const names = (fields: Field[]) => fields.map((f) => f.name);

describe('visibility', () => {
  it('passes a field with no permissions through untouched', () => {
    const fields = [field('name')];
    expect(run(fields, [])[0]).toBe(fields[0]);
  });

  it('removes a field the user has no listed role for', () => {
    const fields = [field('name'), field('cost', { visible: ['ROLE_FINANCE'] })];
    expect(names(run(fields, ['ROLE_SALES']))).toEqual(['name']);
  });

  it('keeps the field when any one role matches', () => {
    const fields = [field('cost', { visible: ['ROLE_FINANCE', 'ROLE_ADMIN'] })];
    expect(names(run(fields, ['ROLE_SALES', 'ROLE_ADMIN']))).toEqual(['cost']);
  });

  it('removes a restricted field from a user with no roles at all', () => {
    // An account nobody finished configuring is far more common than a
    // deliberate grant of everything, so an empty role list must see less.
    const fields = [field('cost', { visible: ['ROLE_FINANCE'] })];
    expect(run(fields, [])).toEqual([]);
  });
});

describe('editability', () => {
  it('disables rather than hides a field the user may see but not change', () => {
    const fields = [field('price', { editable: ['ROLE_FINANCE'] })];
    const [result] = run(fields, ['ROLE_SALES']);

    expect(result.name).toBe('price');
    expect(result.disabledWhen?.({} as never)).toBe(true);
  });

  it('supersedes a data-driven disabledWhen instead of merging with it', () => {
    // Role restrictions are absolute. Letting a data rule re-enable the field
    // would make the stricter of the two rules the one that loses.
    const permissive: Field = {
      ...field('price', { editable: ['ROLE_FINANCE'] }),
      disabledWhen: () => false,
    };
    const [result] = run([permissive], ['ROLE_SALES']);

    expect(result.disabledWhen?.({} as never)).toBe(true);
  });

  it('leaves the field alone when the user holds the editing role', () => {
    const fields = [field('price', { editable: ['ROLE_FINANCE'] })];
    expect(run(fields, ['ROLE_FINANCE'])[0]).toBe(fields[0]);
  });

  it('applies visibility before editability', () => {
    // A field the user cannot see is not a disabled field, it is absent.
    const fields = [field('cost', { visible: ['ROLE_FINANCE'], editable: ['ROLE_FINANCE'] })];
    expect(run(fields, ['ROLE_SALES'])).toEqual([]);
  });
});

describe('identity fields', () => {
  it('survives every restriction, so rows keep resolving their key', () => {
    const identity = { ...identityField().build(), permissions: { visible: ['ROLE_ADMIN'] } };
    const result = run([identity, field('name')], []);

    // Dropping the key would not hide data — it would break the grid's ability
    // to address a row at all, including for the user who is allowed to see it.
    expect(names(result)).toEqual([identity.name, 'name']);
    expect(result[0]).toBe(identity);
  });
});

describe('what this hook does not do', () => {
  it('never rewrites the field values it hides', () => {
    // Filtering happens on the field list, not on the record. The row still
    // holds whatever the API sent, which is why this cannot be the boundary
    // that protects it — only the backend not sending it can.
    const fields = [field('cost', { visible: ['ROLE_FINANCE'] })];
    const result = run(fields, ['ROLE_SALES']);

    expect(result).toEqual([]);
    expect(fields[0].permissions).toEqual({ visible: ['ROLE_FINANCE'] });
  });
});
