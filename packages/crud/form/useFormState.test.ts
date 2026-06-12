/**
 * Unit tests for the form-state seam. These invariants were previously
 * untestable closure internals of NativeFormView; the hook is the state's
 * interface, so they are pinned here once.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { textField } from '../field/FieldBuilders';
import { useFormState } from './useFormState';

const fields = [
  textField().name('name').label('Name').build(),
  textField().name('city').label('City').build(),
];

describe('useFormState', () => {
  it('setFieldValue updates the value, syncs the ref and clears the field error', () => {
    const { result } = renderHook(() => useFormState({ fields }));

    act(() => result.current.setErrors({ name: 'required' }));
    act(() => result.current.setFieldValue('name', 'Ada'));

    expect(result.current.formData.name).toBe('Ada');
    expect(result.current.formDataRef.current.name).toBe('Ada');
    expect(result.current.errors.name).toBe('');
  });

  it('setFieldValue notifies onFieldDataChanged and the field onChange', () => {
    const onFieldDataChanged = vi.fn();
    const onChange = vi.fn();
    const wired = [{ ...fields[0], onChange }, fields[1]];
    const { result } = renderHook(() => useFormState({ fields: wired, onFieldDataChanged }));

    act(() => result.current.setFieldValue('name', 'Ada'));

    expect(onFieldDataChanged).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ada' }));
    expect(onChange).toHaveBeenCalledWith('Ada');
  });

  it('setNextFormData replaces the snapshot wholesale', () => {
    const { result } = renderHook(() => useFormState({ fields }));

    act(() => result.current.setNextFormData({ name: 'Ada', city: 'London' }));

    expect(result.current.formData).toEqual({ name: 'Ada', city: 'London' });
    expect(result.current.formDataRef.current).toEqual({ name: 'Ada', city: 'London' });
  });

  it('clearDetailCellError removes single errors and drops empty rows', () => {
    const { result } = renderHook(() => useFormState({ fields }));

    act(() =>
      result.current.setDetailErrors({ 0: { qty: 'bad', price: 'bad' }, 1: { qty: 'bad' } }),
    );
    act(() => result.current.clearDetailCellError(0, 'qty'));
    expect(result.current.detailErrors).toEqual({ 0: { price: 'bad' }, 1: { qty: 'bad' } });

    act(() => result.current.clearDetailCellError(1, 'qty'));
    expect(result.current.detailErrors).toEqual({ 0: { price: 'bad' } });
  });

  it('upsertUploadedFile replaces entries by field name', () => {
    const { result } = renderHook(() => useFormState({ fields }));

    act(() => result.current.upsertUploadedFile({ name: 'doc', iri: '/media/1' }));
    act(() => result.current.upsertUploadedFile({ name: 'doc', iri: '/media/2' }));

    expect(result.current.uploadedFiles.current).toEqual([{ name: 'doc', iri: '/media/2' }]);
  });

  it('setNextDetailRows keeps the detail ref in sync', () => {
    const { result } = renderHook(() => useFormState({ fields }));

    act(() => result.current.setNextDetailRows([{ qty: 1 }]));

    expect(result.current.detailRows).toEqual([{ qty: 1 }]);
    expect(result.current.detailRowsRef.current).toEqual([{ qty: 1 }]);
  });
});
