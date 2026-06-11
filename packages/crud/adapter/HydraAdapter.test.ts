import { describe, expect, it } from 'vitest';
import { HydraAdapter } from './HydraAdapter';

describe('HydraAdapter.buildItemUrl', () => {
  it('uses an IRI id as the item URL', () => {
    expect(HydraAdapter.buildItemUrl('/api/products', '/api/products/5')).toBe('/api/products/5');
  });

  it('falls back to the collection URL for scalar ids', () => {
    expect(HydraAdapter.buildItemUrl('/api/cash-movements', 52)).toBe('/api/cash-movements/52');
  });

  it('normalizes trailing slashes when appending scalar ids', () => {
    expect(HydraAdapter.buildItemUrl('/api/cash-movements/', 52)).toBe('/api/cash-movements/52');
  });
});
