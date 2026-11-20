import { describe, expect, it } from 'vitest';
import { matchesQuickSearch, resolveQuickSearch } from './GridQuickSearch';

describe('grid quick search', () => {
  it('defaults explicit search to cards and supports table, both, and disabled', () => {
    const config = { searchExpr: ['name', 'code'] };
    expect(resolveQuickSearch(config, true)).toBe(config);
    expect(resolveQuickSearch(config, false)).toBeUndefined();
    expect(resolveQuickSearch({ ...config, showIn: 'table' }, false)).toBeDefined();
    expect(resolveQuickSearch({ ...config, showIn: 'both' }, true)).toBeDefined();
    expect(resolveQuickSearch({ ...config, showIn: 'both' }, false)).toBeDefined();
    expect(resolveQuickSearch(false, true)).toBeUndefined();
    expect(resolveQuickSearch({ searchExpr: [] }, true)).toBeUndefined();
  });

  it('matches any configured scalar field, including nested paths, in local rows', () => {
    const search = { searchExpr: ['customer.name', 'number'], searchValue: 'AC1' };
    expect(matchesQuickSearch({ customer: { name: 'ac10' }, number: '45' }, search)).toBe(true);
    expect(matchesQuickSearch({ customer: null, number: 'X-AC1' }, search)).toBe(true);
    expect(matchesQuickSearch({ customer: { name: {} }, number: 45 }, search)).toBe(false);
  });
});
