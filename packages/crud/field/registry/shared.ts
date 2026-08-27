import { getCoreLocale, getCoreTimezone, type DataRecord } from '@nubitio/core';
import type { Field } from '../Field';
import type { BackendAdapter } from '../../adapter/BackendAdapter';
import type { FilterOperator, SerializedFieldValue } from './FieldTypeModule';

// ─── Display helpers (moved verbatim from NativeDataGridView) ─────────────────

export function getPrimitiveDisplay(value: unknown, yesLabel = 'Yes', noLabel = 'No'): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date)
    return value.toLocaleDateString(getCoreLocale(), { timeZone: getCoreTimezone() });
  if (typeof value === 'boolean') return value ? yesLabel : noLabel;
  if (typeof value === 'object') return '';
  return String(value);
}

export function getDateDisplay(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(getCoreLocale(), { timeZone: getCoreTimezone() });
}

export function getDateTimeDisplay(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(getCoreLocale(), {
    timeZone: getCoreTimezone(),
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function getCurrencyDisplay(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  // Money formatting without assuming a currency code (that is row data):
  // locale-aware thousands separators and exactly two decimals.
  return num.toLocaleString(getCoreLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getEntityDisplayValue(
  field: Field,
  value: unknown,
  entityOptions?: DataRecord[],
): string {
  if (value && typeof value === 'object') {
    const record = value as DataRecord;
    const display = record[field.textField] ?? record['name'] ?? record['businessName'];
    return getPrimitiveDisplay(display);
  }
  // IRI string: look up display text from pre-loaded entity options
  if (value && typeof value === 'string' && entityOptions) {
    const match = entityOptions.find(
      (item) => item[field.valueField] === value || item['@id'] === value || item['_iri'] === value,
    );
    if (match) {
      const display = match[field.textField] ?? match['name'] ?? match['businessName'];
      if (display != null) return getPrimitiveDisplay(display);
    }
  }
  return getPrimitiveDisplay(value);
}

export function getEnumDisplayValue(
  field: Field,
  value: unknown,
  yesLabel?: string,
  noLabel?: string,
): string {
  const match = Array.isArray(field.data)
    ? field.data.find((item) => item['value'] === value || item[field.valueField] === value)
    : undefined;

  const display = match?.['text'] ?? match?.[field.textField] ?? value;
  // SWITCH fields (see switch.tsx) route through here with no `field.data`,
  // so `display` falls through to the raw boolean `value` — without
  // threading yesLabel/noLabel this call used to fall back to
  // getPrimitiveDisplay's hardcoded English defaults ('Yes'/'No'),
  // ignoring the caller's locale even when every other boolean-valued cell
  // (dates, entity refs, plain display-only fields) rendered correctly
  // translated via that same context.
  return yesLabel !== undefined && noLabel !== undefined
    ? getPrimitiveDisplay(display, yesLabel, noLabel)
    : getPrimitiveDisplay(display);
}

// ─── Filter operator sets ─────────────────────────────────────────────────────

export const TEXT_OPERATORS: FilterOperator[] = [
  { value: 'contains', label: '~' },
  { value: 'notcontains', label: '!~' },
  { value: 'startswith', label: '^' },
  { value: '=', label: '=' },
  { value: '<>', label: '≠' },
];

export const NUMERIC_OPERATORS: FilterOperator[] = [
  { value: '=', label: '=' },
  { value: '<>', label: '≠' },
  { value: '>', label: '>' },
  { value: '>=', label: '≥' },
  { value: '<', label: '<' },
  { value: '<=', label: '≤' },
];

export const DATE_OPERATORS: FilterOperator[] = [
  ...NUMERIC_OPERATORS,
  { value: 'between', label: '↔' },
];

export const EQUALITY_OPERATORS: FilterOperator[] = [{ value: '=', label: '=' }];

export const BETWEEN_VALUE_SEPARATOR = '|';

export function splitBetweenValue(value: string): [string, string] {
  const [start = '', end = ''] = value.split(BETWEEN_VALUE_SEPARATOR);
  return [start, end];
}

export function getDateStartOfDay(value: string): string {
  return `${value} 00:00:00`;
}

export function getDateEndOfDay(value: string): string {
  return `${value} 23:59:59`;
}

export function defaultBuildFilterTerms(
  field: Field,
  operator: string,
  value: string,
): unknown[][] {
  return [[field.name, operator, value]];
}

// ─── Serialization helpers ────────────────────────────────────────────────────

export const KEEP: SerializedFieldValue = { kind: 'keep' };
export const OMIT: SerializedFieldValue = { kind: 'omit' };

export function set(value: unknown): SerializedFieldValue {
  return { kind: 'set', value };
}

export function isEmptyWireValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * TEXT-family wire format. A control the user never touched holds `null`, and
 * sending that to a non-nullable column is rejected outright — a JSON column
 * answers "must be array, NULL given", a varchar "must be string". Omission
 * lets server defaults apply, exactly as for numerics below.
 *
 * An empty string is deliberately NOT omitted: for these types it is the
 * cleared state the user chose, and it has to reach the backend for a field to
 * be emptied at all.
 */
export function serializeOptionalTextValue(value: unknown): SerializedFieldValue {
  return value === null || value === undefined ? OMIT : KEEP;
}

/**
 * NUMBER/CURRENCY wire format. An untouched/cleared numeric field is OMITTED,
 * not null/0: backends with string-decimal columns reject null ("must be
 * string, NULL given") and Number(null) would silently write 0. Omission lets
 * server defaults apply (required fields are stopped earlier by validation).
 */
export function serializeNumericValue(field: Field, value: unknown): SerializedFieldValue {
  if (isEmptyWireValue(value)) return OMIT;
  // `??`, not `||`: precision 0 is meaningful — an integer column of minor
  // units must serialize as "1234", and `0 || 2` would silently make it
  // "1234.00", which a bigint column rejects outright.
  return set(field.sendAsString ? Number(value).toFixed(field.precision ?? 2) : Number(value));
}

/**
 * NUMBER/CURRENCY detail-row validation: a required cell must coerce to a
 * number, and range validators bound the coerced value.
 */
export function validateNumericDetailValue(field: Field, value: unknown): boolean {
  const numericValue = Number(value ?? 0);

  if (field.required && Number.isNaN(numericValue)) {
    return false;
  }

  const rangeValidators = field.validators.filter((validator) => validator.type === 'range');
  for (const validator of rangeValidators) {
    const { min, max } = validator.options;
    if (min !== undefined && numericValue < min) {
      return false;
    }
    if (max !== undefined && numericValue > max) {
      return false;
    }
  }

  return true;
}

/** ENTITY/TAGS main-form wire format: adapter-resolved refs, arrays for `multiple`. */
export function serializeEntityFormValue(
  field: Field,
  value: unknown,
  adapter: BackendAdapter,
): SerializedFieldValue {
  if (field.multiple) {
    if (Array.isArray(value)) {
      return set(value.map((item) => adapter.serializeEntityRef(field, item)));
    }
    if (value !== null && value !== undefined && value !== '') {
      const serialized = adapter.serializeEntityRef(field, value);
      return set(serialized !== undefined ? [serialized] : []);
    }
    return OMIT;
  }

  const serialized = adapter.serializeEntityRef(field, value);
  return serialized === undefined ? OMIT : set(serialized);
}
