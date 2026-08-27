import { describe, expect, it } from 'vitest';
import { inferPermissionPrefix } from './inferPermissionPrefix';

describe('inferPermissionPrefix', () => {
  it('singularizes the last URL segment', () => {
    expect(inferPermissionPrefix('/api/invoices')).toBe('invoice');
    expect(inferPermissionPrefix('/api/products/')).toBe('product');
    expect(inferPermissionPrefix('/api/sales-documents')).toBe('sales_document');
    expect(inferPermissionPrefix('/api/categories')).toBe('category');
  });
});
