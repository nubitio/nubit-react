import React from 'react';
import type { DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { DataGridSummaryItem } from './DataGridViewOptions';
import { formatSummaryValue, resolveSummaryText } from '../summary';
import { getColumnWidth } from './gridLayoutUtils';

export function SummaryFooter({
  fields,
  hasCheckbox,
  hasDetail,
  hasRowActions,
  rows,
  summaryFields,
  gridSummary,
  footerRef,
  colWidths,
}: {
  fields: Field[];
  hasCheckbox: boolean;
  hasDetail: boolean;
  hasRowActions: boolean;
  rows: DataRecord[];
  summaryFields?: DataGridSummaryItem[];
  gridSummary?: Record<string, unknown> | null;
  footerRef?: React.Ref<HTMLTableSectionElement>;
  colWidths: Record<string, number>;
}) {
  if (!summaryFields?.length) return null;

  const itemsByColumn = new Map(
    summaryFields.filter((item) => item.column).map((item) => [item.column, item]),
  );
  const unboundItems = summaryFields.filter((item) => !item.column);
  const fallbackFieldName = fields[fields.length - 1]?.name;

  return (
    <tfoot ref={footerRef} className="nb-datagrid__summary-footer">
      <tr>
        {hasDetail && <td className="nb-datagrid__detail-cell" />}
        {hasCheckbox && <td className="nb-datagrid__select-cell" />}
        {fields.map((field) => {
          const item =
            itemsByColumn.get(field.name) ??
            (field.name === fallbackFieldName ? unboundItems[0] : undefined);
          const align = item?.align ?? field.align;
          const justifyContent =
            align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
          return (
            <td
              key={field.name}
              style={{ width: getColumnWidth(field, colWidths), textAlign: align }}
            >
              {item && (
                <div className="nb-datagrid__summary-cell" style={{ justifyContent }}>
                  {item.label && (
                    <span className="nb-datagrid__summary-label">{item.label}</span>
                  )}
                  <span className="nb-datagrid__summary-value">
                    {item.column && gridSummary && item.column in gridSummary
                      ? formatSummaryValue(gridSummary[item.column], item)
                      : resolveSummaryText(rows, item)}
                  </span>
                </div>
              )}
            </td>
          );
        })}
        {hasRowActions && <td className="nb-datagrid__actions-cell" />}
      </tr>
    </tfoot>
  );
}