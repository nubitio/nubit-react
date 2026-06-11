import type { FilterRule } from '../field/FilterRule';
import type { DataRecord } from '@nubitio/core';

export interface GridHandle {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  refresh: () => void;
  reset: () => void;
  loadData: () => Promise<unknown>;
  getSelectedRowKey: () => string | number | undefined;
  getSelectedRow: () => DataRecord | undefined;
  getSelectedRowKeys: () => unknown[];
  getSelectedRows: () => DataRecord[];
  getFilter: () => unknown[];
  filter: (filterRule: FilterRule | null) => void;
}
