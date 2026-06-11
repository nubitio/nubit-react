import { useState, useCallback } from 'react';
import type { DataRecord } from '@nubit/core';

export interface SelectionState {
  selectedIds: (string | number)[];
  selectedCount: number;
  hasSelection: boolean;
  clearSelection: () => void;
}

export function useSelectionState(identityField: string): SelectionState & {
  onSelectionChanged: (selectedRows: DataRecord[]) => void;
} {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const onSelectionChanged = useCallback(
    (selectedRows: DataRecord[]) => {
      const ids = selectedRows.map((row) => {
        const val = row[identityField];
        if (typeof val === 'string' || typeof val === 'number') return val;
        return String(val);
      });
      setSelectedIds(ids);
    },
    [identityField],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    hasSelection: selectedIds.length > 0,
    clearSelection,
    onSelectionChanged,
  };
}
