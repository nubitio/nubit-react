import { getCoreTimezone, type CoreHttpClient, type DataRecord } from '@nubitio/core';
import { Field } from '../field/Field';
import { type ResourceStore, type ResourceStoreFactory } from '../data/ResourceStore';
import type { FormDataRecord } from './FormDataSnapshot';

export function createRemoteSource(
  field: Field,
  httpClient: CoreHttpClient,
  resourceStoreFactory: ResourceStoreFactory,
  prependData?: FormDataRecord[],
): ResourceStore {
  const options = prependData?.length
    ? [{ prependData }, ...field.loadOptions]
    : field.loadOptions;
  return resourceStoreFactory({
    url: field.url ?? '',
    idField: field.valueField,
    byKeyUrl: field.byKeyUrl,
    defaultFilterRules: fieldFilters(field),
    options,
    iriMode: field.valueField === '_iri',
    httpClient,
  });
}

export function fieldKeyValue(field: Field, item: DataRecord): unknown {
  if (field.valueField === '_iri') return item['_iri'] ?? item['@id'] ?? item['id'];
  return item[field.valueField] ?? item['value'] ?? item['id'] ?? item['@id'];
}

export function fieldTextValue(field: Field, item: DataRecord): string {
  if (field.itemFormatter) {
    const formatted = field.itemFormatter(item);
    return formatted == null ? '' : String(formatted);
  }

  const value = item[field.textField] ?? item['text'] ?? item['name'] ?? item['businessName'];
  return value == null ? '' : String(value);
}

export function fieldFilters(field: Field): unknown[][] | undefined {
  if (field.filters.length === 0) return undefined;
  return field.filters.map((filter) => [filter.field, filter.operator, filter.value]);
}

export function fieldSearchExpr(field: Field): string[] {
  if (field.searchExpr && field.searchExpr.length > 0) return field.searchExpr;
  return [field.textField].filter(Boolean);
}

export function inputValue(value: unknown): string | number | readonly string[] | undefined {
  if (value instanceof Date) return value.toLocaleDateString('en-CA', { timeZone: getCoreTimezone() });
  if (typeof value === 'string' || typeof value === 'number') return value;
  return value == null ? '' : String(value);
}
