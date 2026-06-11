import type { DataRecord } from '@nubit/core';
import type { Field } from '../field/Field';
import type { FormDataRecord } from '../form/FormDataSnapshot';
import type { BackendAdapter } from './BackendAdapter';

/**
 * Backend adapter for plain OpenAPI / REST backends.
 *
 * Conventions assumed:
 * - Records use a plain `id` field (numeric or string UUID) as their identifier.
 * - Entity fields are serialized as scalar IDs in POST/PATCH bodies.
 * - Collection responses are either a plain array or `{ items: [...], total: N }`.
 *   Also handles `{ data: [...], total: N }` (common in Laravel / many REST frameworks).
 */
export const RestAdapter: BackendAdapter = {
  getRowId(record, idField) {
    const direct = record[idField];
    if (direct !== undefined && direct !== null) return direct as string | number;
    const id = record['id'];
    if (id !== undefined && id !== null) return id as string | number;
    return '';
  },

  buildItemUrl(baseUrl, id) {
    const base = baseUrl.replace(/\/+$/, '');
    return `${base}/${id}`;
  },

  serializeEntityRef(field, rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === '' || rawValue === -999) {
      return undefined;
    }
    if (typeof rawValue === 'object') {
      const entity = rawValue as FormDataRecord;
      const idValue = entity[field.valueField] ?? entity['id'];
      if (idValue !== undefined && idValue !== null) return idValue;
      return undefined;
    }
    return rawValue;
  },

  normalizeEntityValue(rawValue, field) {
    if (typeof rawValue === 'object' && rawValue !== null) {
      const entity = rawValue as FormDataRecord;
      const directValue = entity[field.valueField];
      if (directValue !== undefined && directValue !== null) return directValue;
      const id = entity['id'];
      if (id !== undefined && id !== null) return id;
    }
    return rawValue;
  },

  getEntityOptionKey(item, field) {
    return item[field.valueField] ?? item['value'] ?? item['id'];
  },

  parseListResponse(response) {
    if (Array.isArray(response)) {
      return { items: response as DataRecord[], total: (response as unknown[]).length };
    }
    if (response === null || typeof response !== 'object') {
      return { items: [], total: 0 };
    }
    const r = response as Record<string, unknown>;
    const items = r['items'] ?? r['data'] ?? r['results'];
    if (Array.isArray(items)) {
      return { items: items as DataRecord[], total: Number(r['total'] ?? r['count'] ?? items.length) };
    }
    return { items: [], total: 0 };
  },

  synthesizeEntityKey(_field, _entityValue) {
    return undefined;
  },
};
