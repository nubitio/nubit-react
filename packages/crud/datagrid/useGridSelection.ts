import { useCallback, useMemo, useState } from 'react';
import type { DataRecord } from '@nubitio/core';

interface GridSelectionOptions {
  rows: DataRecord[];
  getRowKey: (row: DataRecord, fallback?: string | number) => string | number;
  multiple: boolean;
  onChange: (rows: DataRecord[]) => void;
}

export function useGridSelection({ rows, getRowKey, multiple, onChange }: GridSelectionOptions) {
  const [selectedKeys, setSelectedKeys] = useState<Array<string | number>>([]);
  const applySelection = useCallback(
    (nextKeys: Array<string | number>) => {
      setSelectedKeys(nextKeys);
      onChange(rows.filter((row) => nextKeys.includes(getRowKey(row))));
    },
    [getRowKey, onChange, rows],
  );
  const selectRow = useCallback(
    (row: DataRecord) => {
      const key = getRowKey(row);
      applySelection(
        multiple
          ? selectedKeys.includes(key)
            ? selectedKeys.filter((selectedKey) => selectedKey !== key)
            : [...selectedKeys, key]
          : [key],
      );
    },
    [applySelection, getRowKey, multiple, selectedKeys],
  );
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedKeys.includes(getRowKey(row))),
    [getRowKey, rows, selectedKeys],
  );
  const allPageSelected =
    multiple && rows.length > 0 && rows.every((row) => selectedKeys.includes(getRowKey(row)));
  const somePageSelected = multiple && selectedKeys.length > 0 && !allPageSelected;
  const toggleSelectAll = useCallback(
    () => applySelection(allPageSelected ? [] : rows.map((row) => getRowKey(row))),
    [allPageSelected, applySelection, getRowKey, rows],
  );
  const resetSelection = useCallback(() => setSelectedKeys([]), []);

  return {
    selectedKeys,
    selectedRows,
    selectRow,
    allPageSelected,
    somePageSelected,
    toggleSelectAll,
    resetSelection,
  };
}
