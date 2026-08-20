import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGridSelection } from './useGridSelection';

const rows = [{ id: 1 }, { id: 2 }];
const getRowKey = (row: Record<string, unknown>) => row.id as number;

describe('useGridSelection', () => {
  it('replaces selection in single mode', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useGridSelection({ rows, getRowKey, multiple: false, onChange }),
    );
    act(() => result.current.selectRow(rows[0]!));
    act(() => result.current.selectRow(rows[1]!));
    expect(result.current.selectedKeys).toEqual([2]);
    expect(result.current.selectedRows).toEqual([rows[1]]);
    expect(onChange).toHaveBeenLastCalledWith([rows[1]]);
  });

  it('toggles individual and full-page selection in multiple mode', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useGridSelection({ rows, getRowKey, multiple: true, onChange }),
    );
    act(() => result.current.selectRow(rows[0]!));
    expect(result.current.somePageSelected).toBe(true);
    act(() => result.current.toggleSelectAll());
    expect(result.current.selectedKeys).toEqual([1, 2]);
    expect(result.current.allPageSelected).toBe(true);
    act(() => result.current.toggleSelectAll());
    expect(result.current.selectedKeys).toEqual([]);
  });
});
