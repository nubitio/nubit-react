import { describe, expect, it } from 'vitest';
import { defineResourceGrouped } from './defineResource';
import { flattenResourceGroups } from './ResourceConfigGroups';

describe('ResourceConfigGroups', () => {
  it('flattens grouped config into top-level props', () => {
    const flat = flattenResourceGroups({
      display: { title: 'Invoices', viewMode: 'drawer' },
      access: { permissions: { canView: true } },
      form: { detail: { inferFields: true, propertyName: 'lines' } },
    });

    expect(flat).toMatchObject({
      title: 'Invoices',
      viewMode: 'drawer',
      permissions: { canView: true },
      formDetail: { inferFields: true, propertyName: 'lines' },
    });
  });

  it('defineResourceGrouped produces a valid ResourceConfig', () => {
    const resource = defineResourceGrouped('/api/invoices', {
      display: { title: 'Invoices' },
      access: { auditTrail: { enabled: true, apiUrl: (id) => `/api/audit/${id}` } },
    });

    expect(resource.apiUrl).toBe('/api/invoices');
    expect(resource.title).toBe('Invoices');
    expect(resource.auditTrail?.enabled).toBe(true);
  });
});