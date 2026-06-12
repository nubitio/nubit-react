import React from 'react';
import { useCoreHttpClient, useCoreTranslation, type DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import { getFieldTypeModule } from '../field/registry/registry';
import type { FilterCellProps } from '../field/registry/FieldTypeModule';
import { renderDefaultFilterCell } from '../field/registry/filterHelpers';
import { BETWEEN_VALUE_SEPARATOR } from '../field/registry/shared';

export function joinBetweenValue(start: string, end: string): string {
  if (!start && !end) return '';
  return `${start}${BETWEEN_VALUE_SEPARATOR}${end}`;
}

export function getDefaultFilterOperator(field: Field): string {
  return field.selectedFilterOperation ?? getFieldTypeModule(field.type).defaultFilterOperator;
}

export function computeDefaultOperators(fields: Field[]): Record<string, string> {
  const defaults: Record<string, string> = {};
  fields.forEach((field) => {
    if (field.filterable) defaults[field.name] = getDefaultFilterOperator(field);
  });
  return defaults;
}

export function buildFilterExpression(
  filters: Record<string, string>,
  operators: Record<string, string>,
  fields: Field[],
): unknown[][] {
  return Object.entries(filters)
    .filter(([, value]) => value.trim() !== '')
    .flatMap(([fieldName, value]) => {
      const field = fields.find((candidate) => candidate.name === fieldName);
      const operator = operators[fieldName] ?? 'contains';
      if (!field) return [[fieldName, operator, value]];
      return getFieldTypeModule(field.type).buildFilterTerms(field, operator, value);
    });
}

/**
 * One filter-row cell. The type-specific editor comes from the field's
 * Field-Type module (`FilterCellRender`); types without one get the
 * operator-dropdown shell with a plain text input.
 */
export function FilterCell({
  field,
  operator,
  remoteOptions,
  value,
  onClear,
  onInputChange,
  onBetweenInputChange,
  onSelectChange,
  onOperatorChange,
}: {
  field: Field;
  operator: string;
  remoteOptions: DataRecord[];
  value: string;
  onClear: () => void;
  onInputChange: (value: string) => void;
  onBetweenInputChange: (start: string, end: string) => void;
  onSelectChange: (value: string) => void;
  onOperatorChange: (operator: string) => void;
}) {
  const httpClient = useCoreHttpClient();
  const { t } = useCoreTranslation();

  const typeModule = getFieldTypeModule(field.type);
  const cell: FilterCellProps = {
    field,
    operator,
    value,
    remoteOptions,
    httpClient,
    t,
    onClear,
    onInputChange,
    onBetweenInputChange,
    onSelectChange,
    onOperatorChange,
  };

  return (
    <>
      {typeModule.FilterCellRender
        ? typeModule.FilterCellRender(cell)
        : renderDefaultFilterCell(cell, typeModule.filterOperators)}
    </>
  );
}
