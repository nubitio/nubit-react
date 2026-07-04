import type { Field } from '@nubitio/crud';
import { FieldType, getFieldTypeModule } from '@nubitio/crud';
import { BETWEEN_VALUE_SEPARATOR } from '@nubitio/crud';

type DxFilterTriplet = [string, string, unknown];

function isDxFilterTriplet(value: unknown): value is DxFilterTriplet {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'string'
  );
}

function isLogicalOperator(value: unknown): value is 'and' | 'or' | '!' {
  return value === 'and' || value === 'or' || value === '!';
}

/**
 * Flattens a DevExtreme filter expression into leaf triplets.
 * Compound `and` groups are fully expanded. `or` groups are also flattened
 * (API Platform treats multiple filter[] params as conjunction).
 */
export function flattenDxFilter(filter: unknown): DxFilterTriplet[] {
  if (filter == null || filter === '') return [];
  if (isDxFilterTriplet(filter)) return [filter];

  if (!Array.isArray(filter)) return [];

  if (filter.length === 3 && typeof filter[0] === 'string' && !isLogicalOperator(filter[1])) {
    return [filter as DxFilterTriplet];
  }

  const leaves: DxFilterTriplet[] = [];
  for (const item of filter) {
    if (isLogicalOperator(item)) continue;
    leaves.push(...flattenDxFilter(item));
  }
  return leaves;
}

function normalizeFilterValue(field: Field | undefined, operator: string, value: unknown): string {
  if (operator === 'between' && Array.isArray(value)) {
    const [start = '', end = ''] = value.map((part) => String(part ?? ''));
    return `${start}${BETWEEN_VALUE_SEPARATOR}${end}`;
  }

  if (field?.type === FieldType.CHECKBOX || field?.type === FieldType.SWITCH) {
    if (value === true || value === 'true' || value === 1) return 'true';
    if (value === false || value === 'false' || value === 0) return 'false';
  }

  if (value instanceof Date) {
    if (field?.type === FieldType.DATETIME) {
      return value.toISOString();
    }
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? '');
}

const DX_TO_NUBIT_OPERATOR: Record<string, string> = {
  '=': '=',
  '<>': '<>',
  '>': '>',
  '>=': '>=',
  '<': '<',
  '<=': '<=',
  contains: 'contains',
  notcontains: 'notcontains',
  startswith: 'startswith',
  endswith: 'endswith',
  between: 'between',
};

function mapDxOperator(operator: string): string {
  return DX_TO_NUBIT_OPERATOR[operator] ?? operator;
}

/**
 * Converts a DevExtreme filter expression into Nubit/Hydra filter tuples,
 * applying per-field `buildFilterTerms` expansion (e.g. date `between`).
 */
export function convertDxFilterToNubit(
  filter: unknown,
  fields: Field[],
): unknown[][] {
  return flattenDxFilter(filter).flatMap(([fieldName, operator, rawValue]) => {
    const field = fields.find((candidate) => candidate.name === fieldName);
    const mappedOperator = mapDxOperator(operator);
    const value = normalizeFilterValue(field, mappedOperator, rawValue);
    if (value.trim() === '' && mappedOperator !== '=') return [];

    if (!field) {
      return [[fieldName, mappedOperator, value]];
    }

    return getFieldTypeModule(field.type).buildFilterTerms(field, mappedOperator, value);
  });
}

export interface RoutingFilterRule {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export function mergeGridFilters(
  routingFilters: RoutingFilterRule[] | undefined,
  dxFilter: unknown,
  fields: Field[],
): unknown[][] {
  const routingTerms =
    routingFilters?.flatMap((rule) => {
      const field = fields.find((candidate) => candidate.name === rule.field);
      const value = String(rule.value ?? '');
      if (!field) return [[rule.field, rule.operator, value]];
      return getFieldTypeModule(field.type).buildFilterTerms(field, rule.operator, value);
    }) ?? [];

  const dxTerms = convertDxFilterToNubit(dxFilter, fields);
  return [...routingTerms, ...dxTerms];
}