import type { Field, FieldControlKind } from '@nubitio/crud';
import { getFieldTypeModule } from '@nubitio/crud';

export interface DxColumnDef {
  dataField: string;
  caption: string;
  dataType?: 'string' | 'number' | 'date' | 'datetime' | 'boolean';
  visible?: boolean;
  allowSorting?: boolean;
  allowFiltering?: boolean;
  width?: number | string;
  format?: string;
}

const DX_DATA_TYPE_BY_KIND: Partial<Record<FieldControlKind, DxColumnDef['dataType']>> = {
  number: 'number',
  date: 'date',
  datetime: 'datetime',
  checkbox: 'boolean',
  switch: 'boolean',
};

function resolveDataType(field: Field): DxColumnDef['dataType'] {
  const kind = getFieldTypeModule(field.type).controlKind ?? 'text';
  const fromKind = DX_DATA_TYPE_BY_KIND[kind];
  if (fromKind) return fromKind;

  return field.valueType === 'number'
    ? 'number'
    : field.valueType === 'date'
      ? 'date'
      : field.valueType === 'datetime'
        ? 'datetime'
        : field.valueType === 'boolean'
          ? 'boolean'
          : 'string';
}

export function mapFieldsToDxColumns(
  fields: Field[],
  visibleColumns?: string[] | null,
): DxColumnDef[] {
  return fields
    .filter((field) => field.visible && !field.hidden)
    .filter(
      (field) => visibleColumns == null || visibleColumns.includes(field.name),
    )
    .sort(
      (left, right) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER),
    )
    .map((field) => ({
      dataField: field.name,
      caption: field.label || field.name,
      dataType: resolveDataType(field),
      allowSorting: field.sortable,
      allowFiltering: field.filterable,
      width: field.width,
      format: field.format || undefined,
    }));
}
