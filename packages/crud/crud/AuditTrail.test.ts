import { describe, expect, it } from 'vitest';
import { createAuditFieldLabelResolver } from './AuditTrail';
import type { Field } from '../field/Field';

describe('createAuditFieldLabelResolver', () => {
  const fields = [{ name: 'phone', label: 'Teléfono' }] as Field[];

  it('prefers explicit fieldLabels map', () => {
    const resolve = createAuditFieldLabelResolver(
      { enabled: true, apiUrl: '/api', fieldLabels: { phone: 'Celular' } },
      fields,
    );
    expect(resolve('phone')).toBe('Celular');
  });

  it('falls back to grid field labels', () => {
    const resolve = createAuditFieldLabelResolver({ enabled: true, apiUrl: '/api' }, fields);
    expect(resolve('phone')).toBe('Teléfono');
  });

  it('falls back to the raw field key', () => {
    const resolve = createAuditFieldLabelResolver({ enabled: true, apiUrl: '/api' }, fields);
    expect(resolve('unknown')).toBe('unknown');
  });
});