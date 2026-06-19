import { describe, expect, it } from 'vitest';
import { resolveArray, resolvePath } from './resolvePath';

describe('resolvePath', () => {
  it('reads nested dot paths', () => {
    const data = { stats: { revenue: 100, nested: { deep: 'ok' } } };
    expect(resolvePath(data, 'stats.revenue')).toBe(100);
    expect(resolvePath(data, 'stats.nested.deep')).toBe('ok');
  });

  it('returns undefined for missing paths', () => {
    expect(resolvePath({ a: 1 }, 'b.c')).toBeUndefined();
    expect(resolvePath(null, 'a')).toBeUndefined();
  });
});

describe('resolveArray', () => {
  it('returns object rows from array paths', () => {
    const data = { rows: [{ id: 1 }, { id: 2 }, null, 'x'] };
    expect(resolveArray(data, 'rows')).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('returns empty array when path is not an array', () => {
    expect(resolveArray({ rows: {} }, 'rows')).toEqual([]);
  });
});