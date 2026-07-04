import React, { useEffect, useMemo, useState } from 'react';
import DataGrid, { Column, LoadPanel } from 'devextreme-react/data-grid';

import { useCoreTranslation } from '@nubitio/core';
import type { DataRecord } from '@nubitio/core';
import type { Field } from '@nubitio/crud';
import { getIdField, useResourceStoreFactory } from '@nubitio/crud';

import { mapFieldsToDxColumns } from './mapFieldsToDxColumns';

export interface DevExtremeDetailGridSectionProps {
  fields: Field[];
  url: string;
}

/**
 * Expanded-row detail grid for DevExtreme DataGrid master-detail.
 * Loads related rows through ResourceStore and renders a read-only nested grid.
 */
export function DevExtremeDetailGridSection({ fields, url }: DevExtremeDetailGridSectionProps) {
  const { t } = useCoreTranslation();
  const resourceStoreFactory = useResourceStoreFactory();
  const [rows, setRows] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const idField = useMemo(() => getIdField(fields), [fields]);
  const columns = useMemo(() => mapFieldsToDxColumns(fields), [fields]);

  useEffect(() => {
    const source = resourceStoreFactory({ url, idField });
    setLoading(true);
    source
      .load({})
      .then((result) => setRows(result.data))
      .finally(() => setLoading(false));
  }, [fields, idField, resourceStoreFactory, url]);

  if (loading) {
    return <div className="nb-dx-detail-grid__loading">{t('grid.loading')}</div>;
  }

  if (rows.length === 0) {
    return <div className="nb-dx-detail-grid__empty">{t('grid.noRecords')}</div>;
  }

  return (
    <div className="nb-dx-detail-grid">
      <DataGrid
        dataSource={rows}
        keyExpr={idField}
        showBorders
        columnAutoWidth
        height={Math.min(360, 56 + rows.length * 36)}
      >
        <LoadPanel enabled={false} />
        {columns.map((column) => (
          <Column key={column.dataField} {...column} allowEditing={false} />
        ))}
      </DataGrid>
    </div>
  );
}