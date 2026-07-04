import React, { useMemo } from 'react';
import DataGrid, { Column, Editing } from 'devextreme-react/data-grid';

import { useCoreTranslation } from '@nubitio/core';
import type { Field } from '@nubitio/crud';
import { buildEmptyRow } from '@nubitio/crud';
import type { FormDataRecord } from '@nubitio/crud';

import { mapFieldsToDxColumns } from './mapFieldsToDxColumns';

export interface DevExtremeFormDetailGridProps {
  fields: Field[];
  rows: FormDataRecord[];
  allowAdding?: boolean;
  allowUpdating?: boolean;
  allowDeleting?: boolean;
  detailErrors?: Record<number, Record<string, string>>;
  onRowsChange: (rows: FormDataRecord[]) => void;
}

export function DevExtremeFormDetailGrid({
  fields,
  rows,
  allowAdding = false,
  allowUpdating = false,
  allowDeleting = false,
  onRowsChange,
}: DevExtremeFormDetailGridProps) {
  const { t } = useCoreTranslation();
  const columns = useMemo(() => mapFieldsToDxColumns(fields), [fields]);

  return (
    <div className="nb-dx-form-detail">
      <div className="nb-dx-form-detail__heading">
        <h3 className="nb-dx-form-detail__title">{t('form.detailTitle')}</h3>
      </div>
      <DataGrid
        dataSource={rows}
        keyExpr="__rowKey"
        showBorders
        onInitNewRow={(event) => {
          const data = event.data as FormDataRecord;
          Object.assign(data, buildEmptyRow(fields), { __rowKey: crypto.randomUUID() });
        }}
        onRowInserted={(event) => {
          const nextRows = [...rows, event.data as FormDataRecord];
          onRowsChange(nextRows);
        }}
        onRowRemoved={(event) => {
          const key = (event.data as FormDataRecord).__rowKey;
          onRowsChange(rows.filter((row) => row.__rowKey !== key));
        }}
        onRowUpdated={(event) => {
          const key = (event.data as FormDataRecord).__rowKey;
          onRowsChange(
            rows.map((row) => (row.__rowKey === key ? (event.data as FormDataRecord) : row)),
          );
        }}
      >
        <Editing
          mode="row"
          allowAdding={allowAdding}
          allowUpdating={allowUpdating}
          allowDeleting={allowDeleting}
          useIcons
        />
        {columns.map((column) => (
          <Column key={column.dataField} {...column} />
        ))}
      </DataGrid>
    </div>
  );
}