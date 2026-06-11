import { getCoreTimezone } from '@nubitio/core';
import { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
import type { FormDataRecord } from './FormDataSnapshot';
import type { BackendAdapter } from '../adapter/BackendAdapter';
import { HydraAdapter } from '../adapter/HydraAdapter';

export type PrependDataMap = Map<string, FormDataRecord[]>;

function upsertPrependData(
  store: PrependDataMap,
  field: Field,
  item: FormDataRecord,
): void {
  const existing = store.get(field.name);
  if (existing) {
    const nextId = item[field.valueField];
    const alreadyPresent = existing.some((candidate) => candidate[field.valueField] === nextId);
    if (!alreadyPresent) {
      existing.unshift(item);
    }
    return;
  }
  store.set(field.name, [item]);
}

/**
 * Builds an empty row from field definitions, applying default values.
 */
export function buildEmptyRow(fields: Field[]): FormDataRecord {
  const row: FormDataRecord = {};
  fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      row[field.name] =
        field.defaultValue instanceof Function ? field.defaultValue() : field.defaultValue;
    } else {
      row[field.name] = undefined;
    }
  });
  return row;
}

/**
 * Normalizes raw API data into the shape expected by the active form editors.
 *
 * - FILE fields are stripped (uploaded separately)
 * - PASSWORD fields are blanked
 * - DATE fields remain YYYY-MM-DD strings
 * - ENTITY fields are normalized to their scalar key for select-style editors
 */
export function normalizeFormData(
  data: FormDataRecord,
  fields: Field[],
  adapter: BackendAdapter = HydraAdapter,
  prependDataByField?: PrependDataMap,
): FormDataRecord {
  const row = { ...data };
  fields.forEach((field) => {
    if (field.type === FieldType.FILE) {
      delete row[field.name];
    }
    if (field.type === FieldType.PASSWORD) {
      row[field.name] = '';
    }
    if (field.type === FieldType.DATE) {
      const rawValue = row[field.name];
      if (typeof rawValue === 'string') {
        row[field.name] = rawValue.slice(0, 10);
      } else if (rawValue instanceof Date) {
        row[field.name] = rawValue.toLocaleDateString('en-CA', { timeZone: getCoreTimezone() });
      } else {
        row[field.name] = null;
      }
    }
    if (field.type === FieldType.ENTITY) {
      normalizeEntityField(row, field, adapter, prependDataByField);
    }
  });

  return row;
}

function normalizeEntityField(
  row: FormDataRecord,
  field: Field,
  adapter: BackendAdapter,
  prependDataByField?: PrependDataMap,
): void {
  const rawValue = row[field.name];

  if (typeof rawValue === 'object' && rawValue !== null) {
    const entityValue = { ...(rawValue as FormDataRecord) };

    // Allow the adapter to synthesize a canonical key when the object lacks one.
    // For Hydra: synthesizes an `_iri` when `@id` is absent.
    // For REST: no-op (returns undefined).
    if (field.valueField === '_iri') {
      const synthesized = adapter.synthesizeEntityKey(field, entityValue);
      if (synthesized && typeof entityValue['_iri'] !== 'string' && typeof entityValue['@id'] !== 'string') {
        entityValue['_iri'] = synthesized;
      }
    }

    // Always add the full object to the dropdown options so the selected item
    // can be displayed even when it is not in the loaded page of results.
    if (prependDataByField) {
      upsertPrependData(prependDataByField, field, entityValue);
    }
  }

  const normalized = adapter.normalizeEntityValue(rawValue, field);
  row[field.name] = normalized ?? null;

  if (row[field.name] === null || row[field.name] === undefined) {
    const fromMap = prependDataByField?.get(field.name);
    row[field.name] = fromMap?.[0] ?? field.loadOptions[0]?.prependData?.[0] ?? null;
  }
}
