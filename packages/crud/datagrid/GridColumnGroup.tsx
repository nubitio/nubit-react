import React from 'react';
import type { Field } from '../field/Field';
import { getColumnWidth } from './gridLayoutUtils';

export function GridColumnGroup({
  fields,
  colWidths,
  hasCheckbox,
  hasDetail,
  hasRowActions,
}: {
  fields: Field[];
  colWidths: Record<string, number>;
  hasCheckbox: boolean;
  hasDetail: boolean;
  hasRowActions: boolean;
}) {
  return (
    <colgroup>
      {hasDetail && <col className="nb-datagrid__detail-col" />}
      {hasCheckbox && <col className="nb-datagrid__checkbox-col" />}
      {fields.map((field) => (
        <col key={field.name} style={{ width: getColumnWidth(field, colWidths) }} />
      ))}
      {hasRowActions && <col className="nb-datagrid__actions-col" />}
    </colgroup>
  );
}