import { describe, expect, it } from 'vitest';
import {
  consolidateAuditEntries,
  createAuditFieldLabelResolver,
  prepareAuditEntries,
} from './AuditTrail';
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

describe('consolidateAuditEntries', () => {
  it('drops net-zero bursts where a field is cleared then restored', () => {
    const entries = consolidateAuditEntries([
      {
        id: 2,
        timestamp: '2026-06-12T11:24:06+00:00',
        user: 'demo_user',
        action: 'update',
        changes: { phone: { before: null, after: '999000111' } },
      },
      {
        id: 1,
        timestamp: '2026-06-12T11:24:06+00:00',
        user: 'demo_user',
        action: 'update',
        changes: { phone: { before: '999000111', after: null } },
      },
    ]);

    expect(entries).toEqual([]);
  });

  it('prepareAuditEntries drops a single row whose diff is only null versus empty', () => {
    const entries = prepareAuditEntries([
      {
        id: 1,
        timestamp: '2026-06-12T11:24:06+00:00',
        user: 'demo_user',
        action: 'update',
        changes: { phone: { before: null, after: '' } },
      },
    ]);

    expect(entries).toEqual([]);
  });

  it('drops bursts where null and empty string cancel out', () => {
    const entries = consolidateAuditEntries([
      {
        id: 2,
        timestamp: '2026-06-12T11:24:06+00:00',
        user: 'demo_user',
        action: 'update',
        changes: { phone: { before: '999000111', after: '' } },
      },
      {
        id: 1,
        timestamp: '2026-06-12T11:24:06+00:00',
        user: 'demo_user',
        action: 'update',
        changes: { phone: { before: null, after: '999000111' } },
      },
    ]);

    expect(entries).toEqual([]);
  });

  it('keeps the earliest before and latest after within the same burst', () => {
    const entries = consolidateAuditEntries([
      {
        id: 2,
        timestamp: '2026-06-12T11:24:06+00:00',
        user: 'demo_user',
        action: 'update',
        changes: { phone: { before: '888', after: '777' } },
      },
      {
        id: 1,
        timestamp: '2026-06-12T11:24:06+00:00',
        user: 'demo_user',
        action: 'update',
        changes: { phone: { before: '999', after: '888' } },
      },
    ]);

    expect(entries).toEqual([
      {
        id: 2,
        timestamp: '2026-06-12T11:24:06+00:00',
        user: 'demo_user',
        action: 'update',
        changes: { phone: { before: '999', after: '777' } },
      },
    ]);
  });
});