import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { numberField, textField } from '../field/FieldBuilders';
import { useInlineEdit } from './useInlineEdit';

const fields = [
  numberField().name('price').label('Precio').build(),
  textField().name('name').label('Nombre').build(),
];

describe('useInlineEdit dirty state', () => {
  it('marks a numeric cell dirty when the edited value differs from the original', () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        mode: 'batch',
        url: '/api/items',
        idField: 'id',
        httpClient: { patch: vi.fn() } as never,
        fields,
      }),
    );

    const original = { id: 1, price: '55.0000', name: 'Widget' };

    act(() => {
      result.current.startCellEdit(original, 'price');
      result.current.updateDraft(1, 'price', 99);
    });

    expect(result.current.isCellDirty(1, 'price', original)).toBe(true);
    expect(result.current.hasDraftChanges(1, original)).toBe(true);
  });

  it('does not mark a cell dirty when only the editor was opened', () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        mode: 'batch',
        url: '/api/items',
        idField: 'id',
        httpClient: { patch: vi.fn() } as never,
        fields,
      }),
    );

    const original = { id: 2, price: '11.0000', name: 'Gadget' };

    act(() => {
      result.current.startCellEdit(original, 'price');
    });

    expect(result.current.draftRows.has(2)).toBe(true);
    expect(result.current.isCellDirty(2, 'price', original)).toBe(false);
    expect(result.current.hasDraftChanges(2, original)).toBe(false);
  });
});