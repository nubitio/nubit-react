import { Field } from '../field/Field';
import { getFieldTypeModule } from '../field/registry/registry';
import type { NormalizeFieldContext } from '../field/registry/FieldTypeModule';
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
 * Per-type behaviour lives in each Field-Type module's `normalizeFormValue`
 * (FILE strips, PASSWORD blanks, DATE truncates to YYYY-MM-DD, ENTITY resolves
 * to its scalar key). Types without a normalizer get the generic rule: object
 * and array values are stripped, scalars pass through untouched.
 */
export function normalizeFormData(
  data: FormDataRecord,
  fields: Field[],
  adapter: BackendAdapter = HydraAdapter,
  prependDataByField?: PrependDataMap,
): FormDataRecord {
  const row = { ...data };
  const ctx: NormalizeFieldContext = {
    adapter,
    prependEntityOption: (field, item) => {
      if (prependDataByField) {
        upsertPrependData(prependDataByField, field, item);
      }
    },
    getPrependData: (field) => prependDataByField?.get(field.name),
  };

  fields.forEach((field) => {
    const normalize = getFieldTypeModule(field.type).normalizeFormValue;
    if (normalize) {
      const outcome = normalize(field, row[field.name], ctx);
      if (outcome.kind === 'set') {
        row[field.name] = outcome.value;
      } else if (outcome.kind === 'omit') {
        delete row[field.name];
      }
      return;
    }

    if (
      Array.isArray(row[field.name]) ||
      (row[field.name] !== null && typeof row[field.name] === 'object')
    ) {
      delete row[field.name];
    }
  });

  return row;
}
