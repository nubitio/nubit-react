import { describe, expect, it, vi } from 'vitest';
import type { DataGridViewOptions } from './DataGridViewOptions';
import { buildNativeRowActions } from './nativeRowActions';

const labels = { inlineEdit: 'Inline edit', edit: 'Edit', view: 'View', delete: 'Delete' };
const baseOptions: DataGridViewOptions = { id: 'grid', title: 'Grid', url: '/rows', fields: [] };

describe('buildNativeRowActions', () => {
  it('orders built-in, custom, and destructive actions', () => {
    const options: DataGridViewOptions = {
      ...baseOptions,
      allowEdit: true,
      allowView: true,
      allowDelete: true,
      onEdit: vi.fn(),
      onView: vi.fn(),
      onDelete: vi.fn(),
      rowActions: [{ text: 'Custom', onClick: vi.fn() }],
    };
    const actions = buildNativeRowActions({
      row: { id: 1 },
      options,
      labels,
      editable: true,
      deletable: true,
      rowInlineMode: false,
      canInlineEditMode: false,
      inlineEditing: false,
      startInlineEdit: vi.fn(),
      emitEdit: vi.fn(),
      requestDelete: vi.fn(),
    });
    expect(actions.map((action) => action.text)).toEqual(['Edit', 'View', 'Custom', 'Delete']);
    expect(actions.at(-1)?.type).toBe('danger');
  });

  it('uses the inline edit action and respects row gates', () => {
    const actions = buildNativeRowActions({
      row: { id: 1 },
      options: { ...baseOptions, allowEdit: true, allowDelete: true, onDelete: vi.fn() },
      labels,
      editable: true,
      deletable: false,
      rowInlineMode: true,
      canInlineEditMode: true,
      inlineEditing: false,
      startInlineEdit: vi.fn(),
      emitEdit: vi.fn(),
      requestDelete: vi.fn(),
    });
    expect(actions.map((action) => action.text)).toEqual(['Inline edit']);
  });
});
