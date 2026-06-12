import React, { useEffect, useState } from 'react';
import { useCoreHttpClient, useCoreTranslation, type DataRecord } from '@nubitio/core';
import { useResourceStoreFactory } from '../data/ResourceStore';
import type { Field } from '../field/Field';
import { getIdField, renderCell } from './cellRendering';
import { GridEmptyStateView } from './GridEmptyStateView';
import { useIsMobile } from './useIsMobile';

/**
 * The expanded-row detail grid: loads the related rows through the
 * ResourceStore and renders them as cards (mobile) or a nested table.
 */
export function DetailGridSection({ fields, url }: { fields: Field[]; url: string }) {
  const httpClient = useCoreHttpClient();
  const resourceStoreFactory = useResourceStoreFactory();
  const { t } = useCoreTranslation();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const source = resourceStoreFactory({ url, idField: getIdField(fields), httpClient });
    setLoading(true);
    source
      .load({})
      .then((result) => setRows(result.data))
      .finally(() => setLoading(false));
  }, [fields, httpClient, resourceStoreFactory, url]);

  if (loading) return <div className="nb-datagrid__loading">{t('grid.loading')}</div>;
  if (rows.length === 0) return <GridEmptyStateView fallbackTitle={t('grid.noRecords')} />;

  if (isMobile) {
    const visibleDetailFields = fields.filter((field) => field.visible && !field.hidden);
    return (
      <div className="nb-datagrid__detail-cards">
        {rows.map((row, rowIndex) => (
          <div
            key={String(row[getIdField(fields)] ?? rowIndex)}
            className="nb-datagrid__detail-card"
          >
            {visibleDetailFields.map((field, columnIndex) => (
              <div key={field.name} className="nb-datagrid__detail-card-row">
                <span className="nb-datagrid__detail-card-label">{field.label}</span>
                <span className="nb-datagrid__detail-card-value">
                  {renderCell(
                    field,
                    row,
                    rowIndex,
                    columnIndex,
                    undefined,
                    t('common.yes'),
                    t('common.no'),
                  )}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="nb-datagrid__detail-content">
      <table className="nb-datagrid__detail-table">
        <thead>
          <tr>
            {fields
              .filter((field) => field.visible && !field.hidden)
              .map((field) => (
                <th key={field.name}>{field.label}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={String(row[getIdField(fields)] ?? rowIndex)}>
              {fields
                .filter((field) => field.visible && !field.hidden)
                .map((field, columnIndex) => (
                  <td key={field.name}>
                    {renderCell(
                      field,
                      row,
                      rowIndex,
                      columnIndex,
                      undefined,
                      t('common.yes'),
                      t('common.no'),
                    )}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
