import { describe, expect, it } from 'vitest';
import { entityField } from '../field/FieldBuilders';
import type { Field } from '../field/Field';
import { RestAdapter } from './RestAdapter';

const customerField = (): Field =>
  entityField('/api/customers', 'id', 'businessName').name('customer').label('Cliente').build();

describe('RestAdapter.getRowId', () => {
  it('reads the declared identity field first', () => {
    expect(RestAdapter.getRowId({ code: 'C-1', id: 9 }, 'code')).toBe('C-1');
  });

  it('falls back to id when the declared field is missing', () => {
    expect(RestAdapter.getRowId({ id: 42 }, 'code')).toBe(42);
  });

  it('falls back to id when the declared field is null', () => {
    expect(RestAdapter.getRowId({ code: null, id: 7 }, 'code')).toBe(7);
  });

  it('returns empty string when no identifier is present', () => {
    expect(RestAdapter.getRowId({ name: 'x' }, 'id')).toBe('');
  });
});

describe('RestAdapter.buildItemUrl', () => {
  it('appends the id to the collection url', () => {
    expect(RestAdapter.buildItemUrl('/api/products', 5)).toBe('/api/products/5');
  });

  it('normalizes a trailing slash on the base url', () => {
    expect(RestAdapter.buildItemUrl('/api/products/', 5)).toBe('/api/products/5');
  });

  it('supports string (uuid) ids', () => {
    expect(RestAdapter.buildItemUrl('/api/products', 'abc-123')).toBe('/api/products/abc-123');
  });
});

describe('RestAdapter.serializeEntityRef', () => {
  const field = customerField();

  it('returns scalar values unchanged', () => {
    expect(RestAdapter.serializeEntityRef(field, 5)).toBe(5);
  });

  it('extracts the valueField from an object', () => {
    expect(RestAdapter.serializeEntityRef(field, { id: 12, businessName: 'ACME' })).toBe(12);
  });

  it('omits empty, null, undefined and the -999 sentinel', () => {
    expect(RestAdapter.serializeEntityRef(field, null)).toBeUndefined();
    expect(RestAdapter.serializeEntityRef(field, undefined)).toBeUndefined();
    expect(RestAdapter.serializeEntityRef(field, '')).toBeUndefined();
    expect(RestAdapter.serializeEntityRef(field, -999)).toBeUndefined();
  });

  it('omits an object that has no resolvable id', () => {
    expect(RestAdapter.serializeEntityRef(field, { businessName: 'ACME' })).toBeUndefined();
  });
});

describe('RestAdapter.normalizeEntityValue', () => {
  const field = customerField();

  it('extracts the valueField from a nested object', () => {
    expect(RestAdapter.normalizeEntityValue({ id: 3, businessName: 'ACME' }, field)).toBe(3);
  });

  it('falls back to id when valueField is absent', () => {
    expect(RestAdapter.normalizeEntityValue({ id: 8 }, field)).toBe(8);
  });

  it('returns scalars unchanged', () => {
    expect(RestAdapter.normalizeEntityValue(99, field)).toBe(99);
    expect(RestAdapter.normalizeEntityValue(null, field)).toBeNull();
  });
});

describe('RestAdapter.getEntityOptionKey', () => {
  const field = customerField();

  it('prefers the valueField', () => {
    expect(RestAdapter.getEntityOptionKey({ id: 1, value: 2 }, field)).toBe(1);
  });

  it('falls back to value then id', () => {
    const noValueField = entityField('/api/x', 'code', 'name').name('x').label('X').build();
    expect(RestAdapter.getEntityOptionKey({ value: 'V' }, noValueField)).toBe('V');
    expect(RestAdapter.getEntityOptionKey({ id: 'I' }, noValueField)).toBe('I');
  });
});

describe('RestAdapter.parseListResponse', () => {
  it('handles a plain array', () => {
    expect(RestAdapter.parseListResponse([{ id: 1 }, { id: 2 }])).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      total: 2,
    });
  });

  it('handles { items, total }', () => {
    expect(RestAdapter.parseListResponse({ items: [{ id: 1 }], total: 50 })).toEqual({
      items: [{ id: 1 }],
      total: 50,
    });
  });

  it('handles Laravel-style { data, total }', () => {
    expect(RestAdapter.parseListResponse({ data: [{ id: 1 }], total: 7 })).toEqual({
      items: [{ id: 1 }],
      total: 7,
    });
  });

  it('handles { results, count }', () => {
    expect(RestAdapter.parseListResponse({ results: [{ id: 1 }], count: 3 })).toEqual({
      items: [{ id: 1 }],
      total: 3,
    });
  });

  it('derives total from item length when no count is given', () => {
    expect(RestAdapter.parseListResponse({ items: [{ id: 1 }, { id: 2 }] })).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      total: 2,
    });
  });

  it('returns an empty result for unrecognized shapes', () => {
    expect(RestAdapter.parseListResponse({ foo: 'bar' })).toEqual({ items: [], total: 0 });
    expect(RestAdapter.parseListResponse(null)).toEqual({ items: [], total: 0 });
  });
});

describe('RestAdapter.synthesizeEntityKey', () => {
  it('returns undefined — REST has no canonical IRI to synthesize', () => {
    expect(RestAdapter.synthesizeEntityKey(customerField(), { id: 1 })).toBeUndefined();
  });
});
