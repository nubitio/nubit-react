import type { DataGridViewOptions } from '@nubitio/crud';

export type DxEditMode = 'row' | 'cell' | 'batch' | 'popup';

export function resolveDxEditMode(editMode: DataGridViewOptions['editMode']): DxEditMode | null {
  if (!editMode || editMode === 'popup') return null;
  return editMode;
}

export const DX_PAGE_SIZE_OPTIONS = [10, 20, 50];

export function resolveDxRemoteOperations(options: DataGridViewOptions) {
  if (options.data) return false;
  const filterRow = options.filterRow ?? true;
  return {
    // Header filter derives values from the loaded page — keep grouping/filtering
    // off so CustomStore.load is not called in a loop for distinct values.
    filtering: filterRow,
    grouping: false,
    summary: false,
    sorting: true,
    paging: options.paging ?? true,
  };
}

export function isHeaderFilterLookup(loadOptions: Record<string, unknown>): boolean {
  return Array.isArray(loadOptions.group) || loadOptions.requireGroupCount === true;
}
