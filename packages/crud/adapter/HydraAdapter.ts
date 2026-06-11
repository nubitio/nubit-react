import type { DataRecord } from '@nubit/core';
import type { Field } from '../field/Field';
import type { FormDataRecord } from '../form/FormDataSnapshot';
import type { BackendAdapter } from './BackendAdapter';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildIRI(url: string, value: string): string {
  if (value.startsWith('/')) return value;
  return `${url}/${value}`;
}

/**
 * Default backend adapter for API Platform / JSON-LD + Hydra backends.
 *
 * Conventions assumed:
 * - Records carry an `@id` IRI (e.g. `/api/users/5`) as their canonical identifier.
 * - Entity fields are serialized as IRI strings in POST/PATCH bodies.
 * - Collection responses follow the `hydra:member` / `hydra:totalItems` shape.
 * - `_iri` is a synthetic alias for `@id` used internally by the engine.
 */
export const HydraAdapter: BackendAdapter = {
  getRowId(record, idField) {
    const direct = record[idField];
    if (direct !== undefined && direct !== null) return String(direct);
    const iri = record['@id'] ?? record['_iri'];
    if (iri !== undefined && iri !== null) return String(iri);
    return String(record['id'] ?? '');
  },

  buildItemUrl(baseUrl, id) {
    const str = String(id);
    // If id is already an IRI (full path), use it directly.
    if (str.startsWith('/')) return str;
    // Otherwise construct from base URL + numeric/string id.
    return `${trimTrailingSlash(baseUrl)}/${str}`;
  },

  serializeEntityRef(field, rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === '' || rawValue === -999) {
      return undefined;
    }

    if (typeof rawValue === 'object') {
      const entity = rawValue as FormDataRecord;
      const atId = entity['@id'];
      if (typeof atId === 'string') return buildIRI(field.url ?? '', atId);
      const idValue = entity['id'];
      const resolvedId =
        idValue !== undefined && idValue !== null
          ? String(idValue)
          : String(entity[field.valueField]);
      return buildIRI(field.url ?? '', resolvedId);
    }

    return buildIRI(field.url ?? '', String(rawValue));
  },

  normalizeEntityValue(rawValue, field) {
    if (typeof rawValue === 'string') {
      return field.valueField === '_iri' ? rawValue : rawValue.split('/').pop();
    }
    if (typeof rawValue === 'object' && rawValue !== null) {
      const entity = rawValue as FormDataRecord;
      const atId: unknown = entity['@id'];
      if (typeof atId === 'string') {
        return field.valueField === '_iri' ? atId : (atId.split('/').pop() ?? atId);
      }
      const directValue: unknown = entity[field.valueField];
      if (directValue !== undefined && directValue !== null) return directValue;
    }
    return rawValue;
  },

  getEntityOptionKey(item, field) {
    if (field.valueField === '_iri') return item['_iri'] ?? item['@id'] ?? item['id'];
    return item[field.valueField] ?? item['value'] ?? item['id'] ?? item['@id'];
  },

  parseListResponse(response) {
    const r = response as Record<string, unknown>;
    const member = r['hydra:member'];
    if (Array.isArray(member)) {
      return { items: member as DataRecord[], total: Number(r['hydra:totalItems'] ?? member.length) };
    }
    if (Array.isArray(response)) return { items: response as DataRecord[], total: (response as unknown[]).length };
    return { items: [], total: 0 };
  },

  synthesizeEntityKey(field, entityValue) {
    if (!field.url) return undefined;
    const base = trimTrailingSlash(field.url);
    const directId = entityValue['id'];
    if (typeof directId === 'string' || typeof directId === 'number') return `${base}/${directId}`;
    const directValue = entityValue[field.valueField];
    if (field.valueField !== '_iri' && (typeof directValue === 'string' || typeof directValue === 'number')) {
      return `${base}/${directValue}`;
    }
    for (const key of ['code', 'uuid', 'slug'] as const) {
      const candidate = entityValue[key];
      if (typeof candidate === 'string' || typeof candidate === 'number') return `${base}/${candidate}`;
    }
    return undefined;
  },
};
