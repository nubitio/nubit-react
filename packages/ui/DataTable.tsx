import type { ReactNode } from 'react';
import { joinClasses } from './layoutUtils';
import { Pagination, type PaginationProps } from './Pagination';
import { RowActions } from './RowActions';
import type { ContextMenuItem } from './ContextMenu';
import { Text } from './Text';
import './DataTable.scss';

export type DataTableColumnAlign = 'left' | 'right' | 'center';

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  align?: DataTableColumnAlign;
  nowrap?: boolean;
  muted?: boolean;
  render?: (row: T, index: number) => ReactNode;
  accessor?: (row: T) => ReactNode;
}

export type DataTableVariant = 'default' | 'flush';

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T) => string | number;
  emptyMessage?: ReactNode;
  fill?: boolean;
  /** flush drops outer chrome — use inside panel Cards. */
  variant?: DataTableVariant;
  className?: string;
  wrapClassName?: string;
  testId?: string;
  rowActions?: (row: T) => ContextMenuItem[];
  rowActionsLabel?: string;
  renderActions?: (row: T) => ReactNode;
  pagination?: PaginationProps;
}

function alignClass(align?: DataTableColumnAlign): string | undefined {
  if (align === 'right') return 'nb-data-table__cell--num';
  if (align === 'center') return 'nb-data-table__cell--center';
  return undefined;
}

function cellClass(column: DataTableColumn<unknown>): string {
  return joinClasses(
    alignClass(column.align),
    column.muted && 'nb-data-table__cell--muted',
    column.nowrap && 'nb-data-table__cell--nowrap',
  );
}

function renderCell<T>(column: DataTableColumn<T>, row: T, index: number): ReactNode {
  if (column.render) return column.render(row, index);
  if (column.accessor) return column.accessor(row);
  return null;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage,
  fill,
  variant = 'default',
  className,
  wrapClassName,
  testId,
  rowActions,
  rowActionsLabel,
  renderActions,
  pagination,
}: DataTableProps<T>) {
  const hasActions = Boolean(rowActions || renderActions);

  if (rows.length === 0) {
    return emptyMessage ? <Text tone="muted">{emptyMessage}</Text> : null;
  }

  return (
    <>
      <div
        className={joinClasses(
          'nb-data-table-wrap',
          variant === 'flush' && 'nb-data-table-wrap--flush',
          fill && 'nb-data-table-wrap--fill',
          wrapClassName,
        )}
        data-testid={testId}
      >
        <table className={joinClasses('nb-data-table', className)}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.id} className={alignClass(column.align)}>
                  {column.header}
                </th>
              ))}
              {hasActions && <th scope="col" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.id} className={cellClass(column as DataTableColumn<unknown>)}>
                    {renderCell(column, row, index)}
                  </td>
                ))}
                {hasActions && (
                  <td className="nb-data-table__actions">
                    {renderActions
                      ? renderActions(row)
                      : rowActions && (
                          <RowActions items={rowActions(row)} triggerLabel={rowActionsLabel} />
                        )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && <Pagination {...pagination} />}
    </>
  );
}