import type { DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import { getFieldTypeModule } from '../field/registry/registry';

export function getIdField(fields: Field[]): string {
  return fields.find((field) => field.isIdentity)?.name ?? 'id';
}

export function getCellText(
  field: Field,
  row: DataRecord,
  entityOptions?: DataRecord[],
  yesLabel = 'Yes',
  noLabel = 'No',
): string {
  if (field.formatter) return '';
  return getFieldTypeModule(field.type).cellText(field, row[field.name], {
    entityOptions,
    yesLabel,
    noLabel,
  });
}

export function renderCell(
  field: Field,
  row: DataRecord,
  rowIndex: number,
  columnIndex: number,
  entityOptions?: DataRecord[],
  yesLabel = 'Yes',
  noLabel = 'No',
) {
  const value = row[field.name];
  if (field.formatter) {
    return field.formatter({ value, data: row, rowIndex, columnIndex });
  }
  return getFieldTypeModule(field.type).cellText(field, value, { entityOptions, yesLabel, noLabel });
}
