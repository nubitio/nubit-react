import { describe, expect, it } from 'vitest';
import type { DataGridViewOptions } from '@nubitio/crud';
import {
  DX_PAGE_SIZE_OPTIONS,
  isHeaderFilterLookup,
  resolveDxEditMode,
  resolveDxRemoteOperations,
} from './dxGridConfig';

const options = (value: Partial<DataGridViewOptions>): DataGridViewOptions =>
  value as DataGridViewOptions;

describe('DevExtreme grid configuration', () => {
  it('only enables DevExtreme native inline edit modes', () => {
    expect(resolveDxEditMode(undefined)).toBeNull();
    expect(resolveDxEditMode('popup')).toBeNull();
    expect(resolveDxEditMode('row')).toBe('row');
    expect(resolveDxEditMode('cell')).toBe('cell');
    expect(resolveDxEditMode('batch')).toBe('batch');
  });

  it('uses stable page-size options', () => {
    expect(DX_PAGE_SIZE_OPTIONS).toEqual([10, 20, 50]);
  });

  it('disables remote operations for controlled data', () => {
    expect(resolveDxRemoteOperations(options({ data: [] }))).toBe(false);
  });

  it('defaults remote filtering and paging on and honors explicit opt-outs', () => {
    expect(resolveDxRemoteOperations(options({}))).toEqual({
      filtering: true,
      grouping: false,
      summary: false,
      sorting: true,
      paging: true,
    });
    expect(resolveDxRemoteOperations(options({ filterRow: false, paging: false }))).toEqual({
      filtering: false,
      grouping: false,
      summary: false,
      sorting: true,
      paging: false,
    });
  });

  it('recognizes header-filter lookup loads', () => {
    expect(isHeaderFilterLookup({ group: [{ selector: 'status' }] })).toBe(true);
    expect(isHeaderFilterLookup({ requireGroupCount: true })).toBe(true);
    expect(isHeaderFilterLookup({ group: null, requireGroupCount: false })).toBe(false);
  });
});
