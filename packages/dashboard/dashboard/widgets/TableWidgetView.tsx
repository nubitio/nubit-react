import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, StatCard } from '@nubitio/ui';
import { formatDashboardValue } from '../formatValue';
import { resolveArray } from '../resolvePath';
import type { TableColumnConfig, TableWidgetConfig } from '../types';

type Props = {
  widget: TableWidgetConfig;
  data: Record<string, unknown>;
  loading?: boolean;
};

function renderCell(row: Record<string, unknown>, column: TableColumnConfig): ReactNode {
  const raw = row[column.key];

  if (column.badge) {
    const key = raw == null ? '' : String(raw);
    const variant = column.badge[key] ?? 'secondary';
    const label = column.badgeLabels?.[key] ?? key.replace(/_/g, ' ');
    return (
      <Badge variant={variant} size="sm">
        {label}
      </Badge>
    );
  }

  return formatDashboardValue(raw, column.format ?? 'text');
}

export function TableWidgetView({ widget, data, loading }: Props) {
  const rows = resolveArray(data, widget.dataPath);

  return (
    <StatCard
      title={widget.title}
      headerExtra={
        <div className="nb-dashboard-table__header-extra">
          {widget.subtitle && <span className="nb-dashboard-widget__subtitle">{widget.subtitle}</span>}
          {widget.viewAll && (
            <Link to={widget.viewAll.to} className="nb-dashboard-table__view-all">
              {widget.viewAll.label ?? 'View all'}
            </Link>
          )}
        </div>
      }
      menuVisible={widget.menuVisible}
      isLoading={loading}
      className="nb-dashboard-table-card"
    >
      {rows.length === 0 ? (
        <EmptyState
          size="sm"
          icon="ph ph-table"
          title={widget.emptyTitle ?? 'No records yet'}
          description={widget.emptyDescription}
        />
      ) : (
        <div className="nb-dashboard-table-wrap">
          <table className="nb-dashboard-table">
            <thead>
              <tr>
                {widget.columns.map((column) => (
                  <th
                    key={column.key}
                    className={column.align ? `nb-dashboard-table__cell--${column.align}` : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {widget.columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.align ? `nb-dashboard-table__cell--${column.align}` : undefined}
                    >
                      {renderCell(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StatCard>
  );
}