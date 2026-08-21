import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
import { textField, numberField } from '../field/FieldBuilders';
import { BETWEEN_VALUE_SEPARATOR } from '../field/registry/shared';
import { FILTER_DEBOUNCE_MS, useGridQueryState } from './useGridQueryState';

const name = textField().name('name').label('Name').sortable(true).filterable(true).build();
const price = numberField().name('price').label('Price').sortable(true).filterable(true).build();
const readonlyCode = textField()
  .name('code')
  .label('Code')
  .sortable(false)
  .filterable(false)
  .build();
const fields: Field[] = [name, price, readonlyCode];

const setup = (onFilterChange?: (filters: Record<string, string>) => void) =>
  renderHook(() => useGridQueryState({ fields, initialPageSize: 20, onFilterChange }));

describe('useGridQueryState', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('initial state', () => {
    it('starts unfiltered on the first page with the requested page size', () => {
      const { result } = setup();

      expect(result.current.filters).toEqual({});
      expect(result.current.filterInputs).toEqual({});
      expect(result.current.sort).toEqual([]);
      expect(result.current.page).toBe(0);
      expect(result.current.pageSize).toBe(20);
    });

    it('seeds an operator for every filterable field and none for the rest', () => {
      const { result } = setup();

      expect(Object.keys(result.current.filterOperators).sort()).toEqual(['name', 'price']);
    });

    it('honours the caller-supplied initial sort', () => {
      const { result } = renderHook(() =>
        useGridQueryState({ fields, initialSort: [{ selector: 'name', desc: true }] }),
      );

      expect(result.current.sort).toEqual([{ selector: 'name', desc: true }]);
    });

    it('defaults the page size when the caller supplies none', () => {
      const { result } = renderHook(() => useGridQueryState({ fields }));

      expect(result.current.pageSize).toBe(20);
    });
  });

  describe('sorting', () => {
    it('cycles a sortable field through ascending, descending and unsorted', () => {
      const { result } = setup();

      act(() => result.current.toggleSort(name));
      expect(result.current.sort).toEqual([{ selector: 'name', desc: false }]);

      act(() => result.current.toggleSort(name));
      expect(result.current.sort).toEqual([{ selector: 'name', desc: true }]);

      act(() => result.current.toggleSort(name));
      expect(result.current.sort).toEqual([]);
    });

    it('replaces the rule when a different field is sorted', () => {
      const { result } = setup();

      act(() => result.current.toggleSort(name));
      act(() => result.current.toggleSort(price));

      expect(result.current.sort).toEqual([{ selector: 'price', desc: false }]);
    });

    it('ignores fields that are not sortable', () => {
      const { result } = setup();

      act(() => result.current.toggleSort(readonlyCode));

      expect(result.current.sort).toEqual([]);
    });

    it('sortBy keeps the current direction and clears on null', () => {
      const { result } = setup();

      act(() => result.current.toggleSort(name));
      act(() => result.current.toggleSort(name));
      act(() => result.current.sortBy('price'));
      expect(result.current.sort).toEqual([{ selector: 'price', desc: true }]);

      act(() => result.current.sortBy(null));
      expect(result.current.sort).toEqual([]);
    });

    it('toggleSortDirection flips the active rule and is inert while unsorted', () => {
      const { result } = setup();

      act(() => result.current.toggleSortDirection());
      expect(result.current.sort).toEqual([]);

      act(() => result.current.sortBy('name'));
      act(() => result.current.toggleSortDirection());
      expect(result.current.sort).toEqual([{ selector: 'name', desc: true }]);
    });
  });

  describe('pagination', () => {
    it('steps forward and backward within bounds', () => {
      const { result } = setup();

      act(() => result.current.goToNextPage(3));
      act(() => result.current.goToNextPage(3));
      expect(result.current.page).toBe(2);

      act(() => result.current.goToNextPage(3));
      expect(result.current.page).toBe(2);

      act(() => result.current.goToPreviousPage());
      expect(result.current.page).toBe(1);
    });

    it('never steps below the first page', () => {
      const { result } = setup();

      act(() => result.current.goToPreviousPage());

      expect(result.current.page).toBe(0);
    });

    it('returns to the first page when the page size changes', () => {
      const { result } = setup();

      act(() => result.current.goToNextPage(5));
      act(() => result.current.setPageSize(50));

      expect(result.current.pageSize).toBe(50);
      expect(result.current.page).toBe(0);
    });
  });

  describe('the page-reset invariant', () => {
    // Narrowing the result set while deep in the pages would otherwise leave
    // the reader on a page that no longer exists.
    it('returns to the first page when a filter is committed', () => {
      const { result } = setup();

      act(() => result.current.goToNextPage(9));
      act(() => result.current.applyFilterInputsImmediate({ name: 'acme' }));

      expect(result.current.page).toBe(0);
    });

    it('returns to the first page when sorting changes', () => {
      const { result } = setup();

      act(() => result.current.goToNextPage(9));
      act(() => result.current.toggleSort(name));

      expect(result.current.page).toBe(0);
    });

    it('returns to the first page when a debounced filter lands', () => {
      const { result } = setup();

      act(() => result.current.goToNextPage(9));
      act(() => result.current.applyFilterInputDebounced(name, 'ac'));
      expect(result.current.page).toBe(1);

      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
      expect(result.current.page).toBe(0);
    });
  });

  describe('debounced filtering', () => {
    it('shows the typed value immediately but commits it only after the delay', () => {
      const onFilterChange = vi.fn();
      const { result } = setup(onFilterChange);

      act(() => result.current.applyFilterInputDebounced(name, 'ac'));
      expect(result.current.filterInputs).toEqual({ name: 'ac' });
      expect(result.current.filters).toEqual({});
      expect(onFilterChange).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
      expect(result.current.filters).toEqual({ name: 'ac' });
      expect(onFilterChange).toHaveBeenCalledExactlyOnceWith({ name: 'ac' });
    });

    it('commits only the last value of a burst of keystrokes', () => {
      const onFilterChange = vi.fn();
      const { result } = setup(onFilterChange);

      act(() => result.current.applyFilterInputDebounced(name, 'a'));
      act(() => vi.advanceTimersByTime(100));
      act(() => result.current.applyFilterInputDebounced(name, 'ac'));
      act(() => vi.advanceTimersByTime(100));
      act(() => result.current.applyFilterInputDebounced(name, 'acme'));
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));

      expect(result.current.filters).toEqual({ name: 'acme' });
      expect(onFilterChange).toHaveBeenCalledExactlyOnceWith({ name: 'acme' });
    });

    it('drops the key entirely when the field is emptied', () => {
      const { result } = setup();

      act(() => result.current.applyFilterInputDebounced(name, 'acme'));
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
      act(() => result.current.applyFilterInputDebounced(name, ''));
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));

      expect(result.current.filterInputs).toEqual({});
      expect(result.current.filters).toEqual({});
    });

    it('keeps filters on other fields while one is being typed', () => {
      const { result } = setup();

      act(() => result.current.applyFilterInputsImmediate({ price: '10' }));
      act(() => result.current.applyFilterInputDebounced(name, 'acme'));
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));

      expect(result.current.filters).toEqual({ price: '10', name: 'acme' });
    });

    it('an immediate commit cancels a debounce already in flight', () => {
      const onFilterChange = vi.fn();
      const { result } = setup(onFilterChange);

      act(() => result.current.applyFilterInputDebounced(name, 'stale'));
      act(() => result.current.applyFilterInputsImmediate({ price: '10' }));
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));

      expect(result.current.filters).toEqual({ price: '10' });
      expect(onFilterChange).toHaveBeenCalledExactlyOnceWith({ price: '10' });
    });

    // A timer surviving unmount would set state on a dead component.
    it('drops a pending debounce when the grid unmounts', () => {
      const onFilterChange = vi.fn();
      const { result, unmount } = setup(onFilterChange);

      act(() => result.current.applyFilterInputDebounced(name, 'acme'));
      unmount();
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));

      expect(onFilterChange).not.toHaveBeenCalled();
    });
  });

  describe('operators', () => {
    it('reports the field default until one is chosen', () => {
      const { result } = setup();
      const initial = result.current.operatorFor(name);

      act(() => result.current.applyFilterOperator(name, 'endswith'));

      expect(initial).not.toBe('endswith');
      expect(result.current.operatorFor(name)).toBe('endswith');
    });

    it('switching operator with no value entered does not touch the query', () => {
      const onFilterChange = vi.fn();
      const { result } = setup(onFilterChange);

      act(() => result.current.applyFilterOperator(name, 'endswith'));

      expect(result.current.filters).toEqual({});
      expect(onFilterChange).not.toHaveBeenCalled();
    });

    it('expands the current value into a range when switching to between', () => {
      const { result } = setup();

      act(() => result.current.applyFilterInputsImmediate({ price: '10' }));
      act(() => result.current.applyFilterOperator(price, 'between'));

      expect(result.current.filterInputs.price).toBe(`10${BETWEEN_VALUE_SEPARATOR}`);
      expect(result.current.filters.price).toBe(`10${BETWEEN_VALUE_SEPARATOR}`);
    });

    it('collapses a range back to its first bound when leaving between', () => {
      const { result } = setup();

      act(() =>
        result.current.applyFilterInputsImmediate({ price: `10${BETWEEN_VALUE_SEPARATOR}20` }),
      );
      act(() => result.current.applyFilterOperator(price, '>='));

      expect(result.current.filterInputs.price).toBe('10');
      expect(result.current.filters.price).toBe('10');
    });

    it('leaves an already-shaped value alone when the operator stays between', () => {
      const { result } = setup();
      const range = `10${BETWEEN_VALUE_SEPARATOR}20`;

      act(() => result.current.applyFilterInputsImmediate({ price: range }));
      act(() => result.current.applyFilterOperator(price, 'between'));

      expect(result.current.filterInputs.price).toBe(range);
    });
  });

  describe('clearing', () => {
    it('clearFilter removes one field and commits the rest', () => {
      const onFilterChange = vi.fn();
      const { result } = setup(onFilterChange);

      act(() => result.current.applyFilterInputsImmediate({ name: 'acme', price: '10' }));
      act(() => result.current.clearFilter(name));

      expect(result.current.filterInputs).toEqual({ price: '10' });
      expect(result.current.filters).toEqual({ price: '10' });
      expect(onFilterChange).toHaveBeenLastCalledWith({ price: '10' });
    });

    it('resetQuery drops filters, operator overrides, sorting and the page', () => {
      const { result } = setup();

      act(() => result.current.applyFilterInputsImmediate({ name: 'acme' }));
      act(() => result.current.applyFilterOperator(name, 'endswith'));
      act(() => result.current.toggleSort(price));
      act(() => result.current.goToNextPage(4));

      act(() => result.current.resetQuery());

      expect(result.current.filters).toEqual({});
      expect(result.current.filterInputs).toEqual({});
      expect(result.current.sort).toEqual([]);
      expect(result.current.page).toBe(0);
      expect(result.current.operatorFor(name)).not.toBe('endswith');
    });

    it('resetQuery does not fire onFilterChange — the caller drove it', () => {
      const onFilterChange = vi.fn();
      const { result } = setup(onFilterChange);

      act(() => result.current.applyFilterInputsImmediate({ name: 'acme' }));
      onFilterChange.mockClear();
      act(() => result.current.resetQuery());

      expect(onFilterChange).not.toHaveBeenCalled();
    });
  });

  describe('replaceFilters', () => {
    it('sets inputs and committed filters together', () => {
      const { result } = setup();

      act(() => result.current.goToNextPage(4));
      act(() => result.current.replaceFilters({ name: 'acme' }, { name: 'contains' }));

      expect(result.current.filters).toEqual({ name: 'acme' });
      expect(result.current.filterInputs).toEqual({ name: 'acme' });
      expect(result.current.operatorFor(name)).toBe('contains');
      expect(result.current.page).toBe(0);
    });

    it('cancels a debounce already in flight', () => {
      const { result } = setup();

      act(() => result.current.applyFilterInputDebounced(name, 'stale'));
      act(() => result.current.replaceFilters({ price: '10' }, { price: '=' }));
      act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));

      expect(result.current.filters).toEqual({ price: '10' });
    });
  });

  it('exposes an identity-stable set of actions across re-renders', () => {
    const { result, rerender } = setup();
    const before = result.current.toggleSort;

    rerender();

    expect(result.current.toggleSort).toBe(before);
  });

  it('keeps the identity field out of the operator seed when not filterable', () => {
    const identity = textField().name('id').label('Id').filterable(false).build();
    const { result } = renderHook(() => useGridQueryState({ fields: [identity] }));

    expect(result.current.filterOperators).toEqual({});
    expect(identity.type).toBe(FieldType.TEXT);
  });
});
