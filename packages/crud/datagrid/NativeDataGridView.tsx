import './NativeDataGridView.scss';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AppDropdown, Button, ConfirmDialog, IconButton } from '@nubitio/ui';
import { type ResourceLoadOptions, useResourceStoreFactory } from '../data/ResourceStore';
import type { DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
import type { ResourceToolbarAction } from '../crud/ResourceConfig';
import { formatSummaryValue, resolveSummaryText } from '../summary';

import { useEvents, useCoreHttpClient, useCoreTranslation } from '@nubitio/core';
import { DATA_GRID_EVENTS } from './DataGridEvents';
import type { DataGridSummaryItem, DataGridViewOptions } from './DataGridViewOptions';
import type { GridHandle } from './GridHandle';
import type { FilterRule } from '../field/FilterRule';

import { useSmartCrudRoles } from '../crud/SmartCrudRolesContext';
import {
  buildFilterExpression,
  computeDefaultOperators,
  FilterCell,
  getDefaultFilterOperator,
  joinBetweenValue,
} from './FilterRow';
import { getCellText, getIdField, renderCell } from './cellRendering';
import { DetailGridSection } from './DetailGridSection';
import { canEditFieldInline, useInlineEdit } from './useInlineEdit';
import { INLINE_EDIT_PORTAL_SELECTOR, InlineEditCell } from './InlineEditCell';
import { GridEmptyStateView } from './GridEmptyStateView';
import { BETWEEN_VALUE_SEPARATOR, splitBetweenValue } from '../field/registry/shared';

import { useIsMobile } from './useIsMobile';
import {
  buildGroupBoundaryClassName,
  resolveColumnHeaders,
  resolveFieldGroupBoundaries,
} from './resolveColumnHeaders';
import type { ColumnHeaderCell } from './ColumnGroup';
import { GridColumnGroup } from './GridColumnGroup';
import { SummaryFooter } from './SummaryFooter';
import {
  ACTIONS_COL_WIDTH,
  CHECKBOX_COL_WIDTH,
  computeAutoColumnWidths,
  computeLayoutWidth,
  DEFAULT_COL_WIDTH,
  DETAIL_COL_WIDTH,
  getColumnWidth,
  getPageRange,
  INLINE_ACTIONS_COL_WIDTH,
  lockColumnWidth,
  MIN_COL_WIDTH,
  PAGE_SIZE_OPTIONS,
} from './gridLayoutUtils';
import { isCellEditMode, isDateLikeField, resolveInlineEditToolbar } from './gridFieldUtils';
import {
  buildToolbar,
  getResolvedRowActions,
  getToolbarKey,
  isToolbarActionVisible,
  renderRowActionItem,
  renderToolbarButton,
  SelectionActionsMenu,
} from './gridToolbar';

type SortRule = { selector: string; desc: boolean };

export const NativeDataGridView = forwardRef<GridHandle, DataGridViewOptions>((options, ref) => {
  const { t } = useCoreTranslation();
  const httpClient = useCoreHttpClient();
  const resourceStoreFactory = useResourceStoreFactory();
  const toolbarPermissions = useSmartCrudRoles();
  const navigate = useNavigate();
  const [on, emit] = useEvents();
  const idField = useMemo(() => getIdField(options.fields), [options.fields]);
  const getRowKey = useCallback(
    (row: DataRecord, fallback?: string | number): string | number => {
      const value = row[idField];
      if (typeof value === 'string' || typeof value === 'number') return value;
      return fallback ?? (value as string | number);
    },
    [idField],
  );
  const visibleFields = useMemo(
    () =>
      options.fields
        .filter((field) => field.visible && !field.hidden)
        .filter(
          (field) => options.visibleColumns == null || options.visibleColumns.includes(field.name),
        )
        .sort(
          (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
        ),
    [options.fields, options.visibleColumns],
  );
  const [rows, setRows] = useState<DataRecord[]>([]);
  const rowsRef = useRef<DataRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [gridSummary, setGridSummary] = useState<Record<string, unknown> | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Array<string | number>>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterInputs, setFilterInputs] = useState<Record<string, string>>({});
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [filterOperators, setFilterOperators] = useState<Record<string, string>>(() =>
    computeDefaultOperators(options.fields),
  );
  const [filterRemoteOptions, setFilterRemoteOptions] = useState<Record<string, DataRecord[]>>({});
  const loadedFilterOptionsRef = useRef<Set<string>>(new Set());
  const [sort, setSort] = useState<SortRule[]>(options.sort ?? []);
  const [pageSize, setPageSize] = useState(options.pageSize ?? 20);
  const [confirmRow, setConfirmRow] = useState<DataRecord | null>(null);
  const [page, setPage] = useState(0);
  const [expandedKeys, setExpandedKeys] = useState<Set<unknown>>(() => new Set());
  const [isGridLoading, setIsGridLoading] = useState(!options.manualLoad);
  const [loadingMessage, setLoadingMessage] = useState('');
  const isMobile = useIsMobile();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [expandedCardKeys, setExpandedCardKeys] = useState<Set<unknown>>(() => new Set());
  const [openRowMenu, setOpenRowMenu] = useState<{
    key: unknown;
    rect: DOMRect;
    actions: ResourceToolbarAction[];
  } | null>(null);
  const onContentReadyRef = useRef(options.onContentReady);
  const onRowPreparedRef = useRef(options.onRowPrepared);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const tfootRef = useRef<HTMLTableSectionElement>(null);
  const hScrollRef = useRef<HTMLDivElement>(null);
  const syncHorizontalScrollRef = useRef<() => void>(() => {});
  const [containerWidth, setContainerWidth] = useState(0);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [autoColWidths, setAutoColWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ name: string; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    onContentReadyRef.current = options.onContentReady;
  }, [options.onContentReady]);

  useEffect(() => {
    onRowPreparedRef.current = options.onRowPrepared;
  }, [options.onRowPrepared]);

  // Row actions menu: close on outside click, Escape, or when rows change
  const closeRowMenu = useCallback(() => {
    setOpenRowMenu(null);
  }, []);

  useLayoutEffect(() => {
    const wrap = tableWrapRef.current;
    if (!wrap) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(wrap);
    setContainerWidth(wrap.clientWidth);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const tbody = tbodyRef.current;
    const thead = theadRef.current;
    const tfoot = tfootRef.current;
    const hScroll = hScrollRef.current;
    if (!tbody) return;

    let syncing = false;

    const applyScrollLeft = (scrollLeft: number) => {
      syncing = true;
      if (tbody.scrollLeft !== scrollLeft) tbody.scrollLeft = scrollLeft;
      if (thead && thead.scrollLeft !== scrollLeft) thead.scrollLeft = scrollLeft;
      if (tfoot && tfoot.scrollLeft !== scrollLeft) tfoot.scrollLeft = scrollLeft;
      if (hScroll && hScroll.scrollLeft !== scrollLeft) hScroll.scrollLeft = scrollLeft;
      syncing = false;
    };

    const clampAndSync = () => {
      const maxScroll = Math.max(0, tbody.scrollWidth - tbody.clientWidth);
      applyScrollLeft(Math.min(tbody.scrollLeft, maxScroll));
    };

    syncHorizontalScrollRef.current = clampAndSync;
    clampAndSync();

    const onBodyScroll = () => {
      if (syncing) return;
      applyScrollLeft(tbody.scrollLeft);
    };

    const onFooterScroll = () => {
      if (syncing || !hScroll) return;
      applyScrollLeft(hScroll.scrollLeft);
    };

    // tbody itself is overflow-x: hidden (see .nb-datagrid__table > tbody) so
    // it never grows its own horizontal scrollbar — .nb-datagrid__hscroll
    // below is the single visible one. That means trackpad/shift+wheel
    // horizontal gestures made while hovering the rows no longer move
    // anything on their own; forward them here so that UX isn't lost.
    const onWheel = (e: WheelEvent) => {
      const horizontalDelta = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (horizontalDelta === 0) return;
      const maxScroll = Math.max(0, tbody.scrollWidth - tbody.clientWidth);
      if (maxScroll === 0) return;
      e.preventDefault();
      applyScrollLeft(Math.min(maxScroll, Math.max(0, tbody.scrollLeft + horizontalDelta)));
    };

    tbody.addEventListener('scroll', onBodyScroll, { passive: true });
    tbody.addEventListener('wheel', onWheel, { passive: false });
    hScroll?.addEventListener('scroll', onFooterScroll, { passive: true });

    const layoutObserver = new ResizeObserver(() => clampAndSync());
    layoutObserver.observe(tbody);
    if (thead) layoutObserver.observe(thead);
    if (tfoot) layoutObserver.observe(tfoot);

    return () => {
      tbody.removeEventListener('scroll', onBodyScroll);
      tbody.removeEventListener('wheel', onWheel);
      hScroll?.removeEventListener('scroll', onFooterScroll);
      layoutObserver.disconnect();
    };
  }, [rows.length, visibleFields.length, colWidths, containerWidth, options.summaryFields?.length]);

  // Content-driven auto width (DevExtreme-style columnAutoWidth): measure
  // after the current page has rendered, using the real header/body font so
  // it matches whatever theme/density is active, then size columns that
  // don't have an explicit width to fit their content instead of sitting at
  // the flat 120px default. Recomputes per page since the "widest cell"
  // naturally changes as rows change.
  //
  // setState always goes through setIfChanged: computeAutoColumnWidths (and
  // the {} empty case) return a brand-new object every call, and this effect
  // depends on values (visibleFields, filterRemoteOptions, t) that aren't
  // guaranteed referentially stable from their own callers. Setting an
  // unconditionally-new object on every run turns that into a real infinite
  // render loop — setIfChanged makes the update a no-op once the values
  // stop actually differing, regardless of how often the effect itself reruns.
  useLayoutEffect(() => {
    const setIfChanged = (next: Record<string, number>) => {
      setAutoColWidths((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every((key) => prev[key] === next[key])
        ) {
          return prev;
        }
        return next;
      });
    };

    if (rows.length === 0 || visibleFields.length === 0) {
      setIfChanged({});
      return;
    }
    const sampleHeaderCell = theadRef.current?.querySelector('th');
    const sampleBodyCell = tbodyRef.current?.querySelector('td');
    if (!sampleHeaderCell || !sampleBodyCell) return;

    const headerStyle = getComputedStyle(sampleHeaderCell);
    const bodyStyle = getComputedStyle(sampleBodyCell);
    const headerFont = `${headerStyle.fontWeight} ${headerStyle.fontSize} ${headerStyle.fontFamily}`;
    const bodyFont = `${bodyStyle.fontWeight} ${bodyStyle.fontSize} ${bodyStyle.fontFamily}`;

    setIfChanged(
      computeAutoColumnWidths({
        fields: visibleFields,
        rows,
        bodyFont,
        headerFont,
        getCellText: (field, row) =>
          getCellText(field, row, filterRemoteOptions[field.name], t('common.yes'), t('common.no')),
      }),
    );
  }, [rows, visibleFields, filterRemoteOptions, t]);

  useEffect(() => {
    if (!openRowMenu) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRowMenu();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nb-datagrid__row-actions-popover')) {
        closeRowMenu();
      }
    };
    const onScroll = () => {
      closeRowMenu();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    // Close on scroll of the tbody (scroll now happens on tbody, not table-wrap)
    const tbody = tbodyRef.current;
    tbody?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      tbody?.removeEventListener('scroll', onScroll);
    };
  }, [openRowMenu, closeRowMenu]);

  useEffect(() => {
    if (!filterSheetOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterSheetOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [filterSheetOpen]);

  // Lock background scroll while a mobile bottom sheet is open.
  useEffect(() => {
    const sheetOpen = filterSheetOpen || (isMobile && openRowMenu != null);
    if (!sheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filterSheetOpen, isMobile, openRowMenu]);

  // Card list keeps its own scroll position — reset it when the page changes.
  useEffect(() => {
    cardsRef.current?.scrollTo({ top: 0 });
  }, [page]);

  // Close row menu if the underlying rows change (defensive)
  useEffect(() => {
    if (openRowMenu) closeRowMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  // Close row menu when delete confirm dialog opens
  useEffect(() => {
    if (confirmRow && openRowMenu) {
      closeRowMenu();
    }
  }, [confirmRow, openRowMenu, closeRowMenu]);

  const source = useMemo(
    () =>
      resourceStoreFactory({
        url: options.url,
        idField,
        defaultFilterRules: options.filter as unknown[][] | undefined,
        defaultSortRules: sort,
        httpClient,
      }),
    [httpClient, idField, options.filter, options.url, resourceStoreFactory, sort],
  );

  const fieldsRef = useRef(options.fields);
  fieldsRef.current = options.fields;

  // Monotonically-increasing counter; each load call captures its own version.
  // If a newer load completes first, older results are discarded (stale-response guard).
  const loadSeqRef = useRef(0);

  const loadRows = useCallback(async () => {
    if (options.data) {
      rowsRef.current = options.data;
      setRows(options.data);
      setTotalCount(options.data.length);
      setGridSummary(options.gridSummary ?? null);
      setIsGridLoading(false);
      onContentReadyRef.current?.();
      return options.data;
    }
    if (options.manualLoad) return rowsRef.current;
    setIsGridLoading(true);
    const seq = ++loadSeqRef.current;
    const loadOptions: ResourceLoadOptions = {
      filter: buildFilterExpression(filters, filterOperators, fieldsRef.current),
      sort,
    };
    if (options.paging ?? true) {
      loadOptions.skip = page * pageSize;
      loadOptions.take = pageSize;
    }

    const result = await source.load(loadOptions);
    if (seq !== loadSeqRef.current) return rowsRef.current; // superseded
    rowsRef.current = result.data;
    setRows(result.data);
    setTotalCount(result.totalCount);
    setGridSummary(result.gridSummary ?? null);
    setIsGridLoading(false);
    onContentReadyRef.current?.();
    return result.data;
  }, [filterOperators, filters, options.data, options.gridSummary, options.manualLoad, options.paging, page, pageSize, sort, source]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    rows.forEach((row, rowIndex) => onRowPreparedRef.current?.({ data: row, rowIndex }));
  }, [rows]);

  useEffect(() => {
    if (!options.events?.SUCCESS) return;
    const sub = on(options.events.SUCCESS, () => void loadRows());
    return () => sub.unsubscribe();
  }, [loadRows, on, options.events]);

  useEffect(() => {
    visibleFields
      .filter(
        (f) => f.type === FieldType.ENTITY && f.url && !loadedFilterOptionsRef.current.has(f.name),
      )
      .forEach((f) => {
        loadedFilterOptionsRef.current.add(f.name);
        resourceStoreFactory({ url: f.url!, idField: f.valueField, httpClient, iriMode: true })
          .load({ take: 500 })
          .then((result) => setFilterRemoteOptions((prev) => ({ ...prev, [f.name]: result.data })))
          .catch(() => {});
      });
  }, [httpClient, resourceStoreFactory, visibleFields]);

  const canInlineEditMode =
    options.editMode === 'row' || options.editMode === 'cell' || options.editMode === 'batch';
  const cellEditMode = isCellEditMode(options.editMode);
  const rowInlineMode = options.editMode === 'row';
  const inlineEditToolbar = resolveInlineEditToolbar(options.editMode, options.inlineEditToolbar);
  const showRowInlineActions = options.inlineRowActions ?? rowInlineMode;

  const inlineEdit = useInlineEdit({
    mode: cellEditMode ? 'batch' : 'row',
    url: options.url,
    idField,
    adapter: options.adapter,
    httpClient,
    fields: options.fields,
    onSaveSuccess: () => void loadRows(),
    onSaveError: () => {},
    onBatchSave: options.onBatchSave,
  });

  const dirtyRowCount = useMemo(
    () =>
      rows.filter((row) => {
        const key = row[idField] ?? row;
        return inlineEdit.draftRows.has(key) && inlineEdit.hasDraftChanges(key, row);
      }).length,
    [rows, idField, inlineEdit.draftRows, inlineEdit.hasDraftChanges],
  );
  const hasPendingInlineEdits = dirtyRowCount > 0;

  // Close the active cell editor when clicking outside the grid or its popovers.
  useEffect(() => {
    if (!inlineEdit.activeCell) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.nb-datagrid__edit-cell')) return;
      if (target.closest(INLINE_EDIT_PORTAL_SELECTOR)) return;
      inlineEdit.stopCellEdit();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inlineEdit.activeCell, inlineEdit.stopCellEdit]);

  // Snapshot of mutable state read by the imperative handle. Updated after every render
  // so handle methods always see current values without the handle itself being rebuilt.
  const handleStateRef = useRef({ selectedKeys, filters, filterOperators, loadRows, idField, inlineEdit });
  handleStateRef.current = { selectedKeys, filters, filterOperators, loadRows, idField, inlineEdit }; // eslint-disable-line react-hooks/refs

  useImperativeHandle(
    ref,
    () => ({
      showLoading: (message) => {
        setLoadingMessage(message ?? t('grid.loading'));
        setIsGridLoading(true);
      },
      hideLoading: () => setIsGridLoading(false),
      refresh: () => void handleStateRef.current.loadRows(),
      reset: () => {
        clearTimeout(filterDebounceRef.current);
        setSelectedKeys([]);
        setFilters({});
        setFilterInputs({});
        setFilterOperators(computeDefaultOperators(options.fields));
        setSort([]);
        setPage(0);
        setExpandedKeys(new Set());
      },
      loadData: () => Promise.resolve(rowsRef.current),
      getSelectedRowKey: () => {
        const key = handleStateRef.current.selectedKeys[0];
        return typeof key === 'string' || typeof key === 'number' ? key : undefined;
      },
      getSelectedRow: () =>
        rowsRef.current.find(
          (row) => row[handleStateRef.current.idField] === handleStateRef.current.selectedKeys[0],
        ),
      getSelectedRowKeys: () => handleStateRef.current.selectedKeys,
      getSelectedRows: () =>
        rowsRef.current.filter((row) =>
          handleStateRef.current.selectedKeys.includes(getRowKey(row)),
        ),
      getFilter: () =>
        buildFilterExpression(
          handleStateRef.current.filters,
          handleStateRef.current.filterOperators,
          options.fields,
        ),
      filter: (filterRule: FilterRule | null) => {
        const { filterOperators: currentOps } = handleStateRef.current;
        const nextFilters = filterRule
          ? { [filterRule.field]: String(filterRule.value ?? '') }
          : {};
        const nextOperators = filterRule
          ? {
              ...currentOps,
              [filterRule.field]:
                filterRule.operator ||
                getDefaultFilterOperator(
                  options.fields.find((f) => f.name === filterRule.field) ?? options.fields[0],
                ),
            }
          : computeDefaultOperators(options.fields);
        clearTimeout(filterDebounceRef.current);
        setFilters(nextFilters);
        setFilterInputs(nextFilters);
        setFilterOperators(nextOperators);
        setPage(0);
      },
      hasEditData: () => handleStateRef.current.inlineEdit.draftRows.size > 0,
      saveChanges: () => handleStateRef.current.inlineEdit.saveAll(),
    }),
    [getRowKey, options.fields, t],
  );

  const selectedRows = rows.filter((row) => selectedKeys.includes(getRowKey(row)));

  const applySelection = useCallback(
    (nextKeys: Array<string | number>) => {
      setSelectedKeys(nextKeys);
      const nextRows = rows.filter((item) => nextKeys.includes(getRowKey(item)));
      options.onSelectionChanged?.({ selectedRowsData: nextRows });
      emit(DATA_GRID_EVENTS.SELECTION_CHANGED, nextRows);
    },
    [emit, getRowKey, options, rows],
  );

  const selectRow = (row: DataRecord) => {
    const key = getRowKey(row);
    const nextKeys =
      options.selectionMode === 'multiple'
        ? selectedKeys.includes(key)
          ? selectedKeys.filter((selectedKey) => selectedKey !== key)
          : [...selectedKeys, key]
        : [key];

    applySelection(nextKeys);
  };

  const rowEditable = (row: DataRecord): boolean => options.canEditRow?.(row) !== false;
  const rowDeletable = (row: DataRecord): boolean => options.canDeleteRow?.(row) !== false;

  const buildRowActions = (row: DataRecord): ResourceToolbarAction[] => [
    ...(options.allowEdit &&
    rowEditable(row) &&
    rowInlineMode &&
    canInlineEditMode &&
    !inlineEdit.isEditing(row[idField])
      ? [
          {
            text: t('grid.inlineEditRow'),
            icon: 'ph-pencil-simple',
            disabled: options.editDisabled,
            onClick: () => inlineEdit.startEdit(row),
          },
        ]
      : []),
    ...(options.allowEdit && rowEditable(row) && !canInlineEditMode && (options.onEdit || options.events?.EDIT)
      ? [
          {
            text: t('grid.buttonEdit'),
            icon: 'ph-pencil-simple',
            disabled: options.editDisabled,
            onClick: () => {
              if (options.onEdit) options.onEdit(row);
              else emit(options.events!.EDIT!, { row });
            },
          },
        ]
      : []),
    ...(options.allowView && options.onView
      ? [
          {
            text: t('grid.buttonView'),
            icon: 'ph-eye',
            onClick: () => options.onView!(row),
          },
        ]
      : []),
    ...getResolvedRowActions(row, options.rowActions),
    ...(options.allowDelete && rowDeletable(row) && (options.onDelete || options.events?.DELETE)
      ? [
          {
            text: t('grid.buttonDelete'),
            icon: 'ph-trash',
            type: 'danger' as const,
            disabled: options.deleteDisabled,
            onClick: () => setConfirmRow(row),
          },
        ]
      : []),
  ];

  const openRow = (row: DataRecord) => {
    if (options.allowEdit && rowEditable(row) && rowInlineMode && canInlineEditMode) {
      inlineEdit.startEdit(row);
      return;
    }
    if (options.allowEdit && rowEditable(row) && (options.onEdit || options.events?.EDIT)) {
      if (options.onEdit) options.onEdit(row);
      else emit(options.events!.EDIT!, { row });
      return;
    }
    if (options.allowView && options.onView) {
      options.onView(row);
    }
  };

  // Filter handlers shared by the desktop filter row, the mobile filter sheet
  // and the mobile quick-search bar.
  const applyFilterInputsImmediate = (nextInputs: Record<string, string>) => {
    clearTimeout(filterDebounceRef.current);
    setFilterInputs(nextInputs);
    setFilters(nextInputs);
    setPage(0);
    options.onFilterChange?.(nextInputs);
  };

  const applyFilterInputDebounced = (field: Field, nextValue: string) => {
    const nextInputs = { ...filterInputs, [field.name]: nextValue };
    if (nextValue === '') delete nextInputs[field.name];
    setFilterInputs(nextInputs);
    clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      setFilters(nextInputs);
      setPage(0);
      options.onFilterChange?.(nextInputs);
    }, 300);
  };

  const renderFilterCell = (field: Field) => (
    <FilterCell
      field={field}
      operator={filterOperators[field.name] ?? getDefaultFilterOperator(field)}
      remoteOptions={filterRemoteOptions[field.name] ?? []}
      value={filterInputs[field.name] ?? ''}
      onInputChange={(nextValue) => applyFilterInputDebounced(field, nextValue)}
      onBetweenInputChange={(start, end) => {
        const nextValue = joinBetweenValue(start, end);
        const nextInputs = { ...filterInputs, [field.name]: nextValue };
        if (nextValue === '') delete nextInputs[field.name];
        applyFilterInputsImmediate(nextInputs);
      }}
      onSelectChange={(nextValue) => {
        const nextInputs = { ...filterInputs, [field.name]: nextValue };
        if (nextValue === '') delete nextInputs[field.name];
        applyFilterInputsImmediate(nextInputs);
      }}
      onOperatorChange={(nextOperator) => {
        setFilterOperators((prev) => ({
          ...prev,
          [field.name]: nextOperator,
        }));
        const currentValue = filterInputs[field.name];
        if (currentValue) {
          const nextInputs = { ...filterInputs };
          if (nextOperator === 'between' && !currentValue.includes(BETWEEN_VALUE_SEPARATOR)) {
            nextInputs[field.name] = joinBetweenValue(currentValue, '');
          }
          if (nextOperator !== 'between' && currentValue.includes(BETWEEN_VALUE_SEPARATOR)) {
            nextInputs[field.name] = splitBetweenValue(currentValue).find(Boolean) ?? '';
          }
          applyFilterInputsImmediate(nextInputs);
        }
      }}
      onClear={() => {
        const nextInputs = { ...filterInputs };
        delete nextInputs[field.name];
        applyFilterInputsImmediate(nextInputs);
      }}
    />
  );

  const onAddClick = () => {
    if (options.onAdd) {
      options.onAdd();
      return;
    }
    if (options.events?.ADD) emit(options.events.ADD);
  };
  const confirmDelete = () => {
    if (confirmRow) {
      if (options.onDelete) {
        options.onDelete(confirmRow);
      } else if (options.events?.DELETE) {
        emit(options.events.DELETE, { row: confirmRow });
      }
    }
    setConfirmRow(null);
  };

  const toggleSort = (field: Field) => {
    if (!field.sortable) return;
    setPage(0);
    setSort((current) => {
      const existing = current.find((rule) => rule.selector === field.name);
      if (!existing) return [{ selector: field.name, desc: false }];
      if (!existing.desc) return [{ selector: field.name, desc: true }];
      return [];
    });
  };

  const handleResizeMouseDown = (fieldName: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const th = (event.currentTarget as HTMLElement).closest('th') as HTMLTableCellElement | null;
    if (!th) return;

    resizingRef.current = {
      name: fieldName,
      startX: event.clientX,
      startWidth: th.offsetWidth,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const resize = resizingRef.current;
      const next = Math.max(MIN_COL_WIDTH, resize.startWidth + (moveEvent.clientX - resize.startX));
      setColWidths((current) => ({ ...current, [resize.name]: next }));
      requestAnimationFrame(() => syncHorizontalScrollRef.current());
    };
    const onMouseUp = () => {
      resizingRef.current = null;
      syncHorizontalScrollRef.current();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasCheckbox = options.selectionMode === 'multiple';
  const allPageSelected =
    hasCheckbox && rows.length > 0 && rows.every((row) => selectedKeys.includes(getRowKey(row)));
  const somePageSelected =
    hasCheckbox && selectedKeys.length > 0 && !allPageSelected;

  const toggleSelectAll = () => {
    if (!hasCheckbox || rows.length === 0) return;
    if (allPageSelected) {
      applySelection([]);
      return;
    }
    applySelection(rows.map(getRowKey));
  };

  const renderSelectAllCheckbox = () => (
    <input
      type="checkbox"
      className="nb-datagrid__select-all"
      checked={allPageSelected}
      ref={(element) => {
        if (element) element.indeterminate = somePageSelected;
      }}
      onChange={toggleSelectAll}
      onClick={(event) => event.stopPropagation()}
      aria-label={t('grid.selectAll')}
    />
  );
  const hasBuiltInRowActions = Boolean(
    (options.allowEdit &&
      ((rowInlineMode && showRowInlineActions) || options.onEdit || options.events?.EDIT)) ||
    (options.allowView && options.onView) ||
    (options.allowDelete && (options.onDelete || options.events?.DELETE)),
  );
  const hasRowActions = Boolean(
    options.mode !== 'minimal' && (hasBuiltInRowActions || options.rowActions),
  );
  const colSpan =
    visibleFields.length +
    (hasCheckbox ? 1 : 0) +
    (options.detailFields ? 1 : 0) +
    (hasRowActions ? 1 : 0);
  const hasDetail = Boolean(options.detailFields);
  const actionsColWidth = canInlineEditMode ? INLINE_ACTIONS_COL_WIDTH : ACTIONS_COL_WIDTH;
  const layoutWidth = computeLayoutWidth({
    visibleFields,
    colWidths,
    autoWidths: autoColWidths,
    hasCheckbox,
    hasDetail,
    hasRowActions,
    containerWidth,
    actionsColWidth,
  });

  // Distribute container space proportionally among data columns only.
  // The actions column (fixed UI chrome) is excluded from stretching — it always
  // stays at ACTIONS_COL_WIDTH regardless of how wide the container gets.
  //
  // Deliberately one-directional: columns stretch to fill extra space when
  // content is narrower than the container, but never shrink below their
  // natural (manual/explicit/auto-measured) width when content is wider.
  // Shrinking used to cram every column into the viewport, which fought
  // widths that were set (explicitly, via drag-resize, or via content
  // auto-width) specifically to fit their content — the frequent result was
  // wrapped, uneven-height rows. Letting the row overflow instead is what
  // drives the horizontal scrollbar below the grid (DevExtreme-style, see
  // .nb-datagrid__hscroll) — that scrollbar already existed but rarely
  // triggered because shrinking almost always won the fight to stay within
  // the container first.
  //
  // Always resolves every visible field to a concrete number (manual >
  // explicit > auto-measured > minWidth > default, per getColumnWidth) —
  // never falls back to returning the raw (usually near-empty) colWidths
  // state, which would silently drop the auto-measured width right when it
  // matters most (the overflow/scroll case).
  const resolvedColWidths = useMemo(() => {
    const bases = visibleFields.map((f) => getColumnWidth(f, colWidths, autoColWidths));

    if (visibleFields.length === 0 || containerWidth <= 0) {
      const result: Record<string, number> = {};
      visibleFields.forEach((f, i) => {
        result[f.name] = bases[i]!;
      });
      return result;
    }

    const dataTotal = bases.reduce((sum, width) => sum + width, 0);
    const fixedTotal =
      (hasCheckbox ? CHECKBOX_COL_WIDTH : 0) +
      (hasDetail ? DETAIL_COL_WIDTH : 0) +
      (hasRowActions ? actionsColWidth : 0);
    const available = Math.max(0, containerWidth - fixedTotal);
    const extra = Math.max(0, available - dataTotal);

    const result: Record<string, number> = {};
    if (extra === 0 || dataTotal === 0) {
      visibleFields.forEach((f, i) => {
        result[f.name] = bases[i]!;
      });
      return result;
    }

    let distributed = 0;
    visibleFields.forEach((f, i) => {
      const base = bases[i]!;
      const share =
        i < visibleFields.length - 1 ? Math.round(extra * (base / dataTotal)) : extra - distributed;
      result[f.name] = base + share;
      distributed += share;
    });
    return result;
  }, [visibleFields, colWidths, autoColWidths, hasCheckbox, hasDetail, hasRowActions, containerWidth, actionsColWidth]);

  const columnHeaders = useMemo(
    () => resolveColumnHeaders(visibleFields, options.columnGroupDefs),
    [visibleFields, options.columnGroupDefs],
  );
  const fieldGroupBoundaries = useMemo(
    () => resolveFieldGroupBoundaries(visibleFields, options.columnGroupDefs),
    [visibleFields, options.columnGroupDefs],
  );
  const hasGroupedHeaders = columnHeaders.groupDepth > 0;
  const headerRowCount = hasGroupedHeaders ? columnHeaders.groupDepth + 1 : 1;

  const renderFieldHeader = (
    field: Field,
    headerOptions?: { rowSpan?: number; stickyTop?: string },
  ) => {
    const sortRule = sort.find((rule) => rule.selector === field.name);
    const width = getColumnWidth(field, resolvedColWidths);
    const hasActiveFilter = Boolean((filterInputs[field.name] ?? '').trim());
    const headerClassName = [
      sortRule ? 'nb-datagrid__header-cell--sorted' : '',
      hasActiveFilter ? 'nb-datagrid__header-cell--filtered' : '',
      buildGroupBoundaryClassName(fieldGroupBoundaries[field.name]),
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <th
        key={field.name}
        rowSpan={headerOptions?.rowSpan}
        className={headerClassName || undefined}
        title={field.label}
        style={{
          ...lockColumnWidth(width),
          textAlign: field.align,
          ...(headerOptions?.stickyTop ? { top: headerOptions.stickyTop } : {}),
        }}
        aria-sort={sortRule ? (sortRule.desc ? 'descending' : 'ascending') : undefined}
      >
        {field.sortable ? (
          <button
            type="button"
            className="nb-datagrid__sort-button"
            aria-label={t('grid.sortColumn', { column: field.label })}
            onClick={() => toggleSort(field)}
          >
            <span>{field.label}</span>
            {sortRule ? (
              <i
                className={`ph ${sortRule.desc ? 'ph-caret-down' : 'ph-caret-up'} nb-datagrid__sort-icon`}
                aria-hidden="true"
              />
            ) : (
              <i className="ph ph-caret-up-down nb-datagrid__sort-hint" aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="nb-datagrid__column-label">{field.label}</span>
        )}
        <span
          className="nb-datagrid__col-resize"
          onMouseDown={handleResizeMouseDown(field.name)}
          onClick={(event) => event.stopPropagation()}
          title={t('grid.resizeColumn')}
        />
      </th>
    );
  };

  const getGroupHeaderWidth = (cell: ColumnHeaderCell, leafOffset: number): number | undefined => {
    if (cell.kind !== 'group') return undefined;
    return visibleFields
      .slice(leafOffset, leafOffset + cell.colSpan)
      .reduce((sum, field) => sum + getColumnWidth(field, resolvedColWidths), 0);
  };

  const renderGroupHeaderCell = (
    cell: ColumnHeaderCell,
    cellIndex: number,
    bandRowIndex: number,
    bandRow: ColumnHeaderCell[],
    leafOffset: number,
  ) => {
    if (cell.kind === 'ungrouped') {
      const width = getColumnWidth(cell.field, resolvedColWidths);
      return (
        <th
          key={`band-spacer-${cell.field.name}`}
          className="nb-datagrid__header-band-spacer"
          style={{
            ...lockColumnWidth(width),
            top: `calc(var(--nb-datagrid-header-height) * ${bandRowIndex})`,
          }}
          aria-hidden="true"
        />
      );
    }

    if (cell.kind !== 'group') return null;

    const hasFollowingGroup = bandRow
      .slice(cellIndex + 1)
      .some((nextCell) => nextCell.kind === 'group');
    const groupWidth = getGroupHeaderWidth(cell, leafOffset);

    return (
      <th
        key={`${cell.key}-${cellIndex}`}
        colSpan={cell.colSpan}
        className={
          [
            'nb-datagrid__header-group-cell',
            cell.className,
            hasFollowingGroup ? 'nb-datagrid__col-group-divider' : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
        style={{
          textAlign: cell.align,
          top: `calc(var(--nb-datagrid-header-height) * ${bandRowIndex})`,
          ...(groupWidth ? lockColumnWidth(groupWidth) : {}),
        }}
      >
        {cell.label}
      </th>
    );
  };

  const tableLayoutStyle = {
    '--nb-datagrid-layout-width': `${layoutWidth}px`,
    '--nb-datagrid-header-row-count': headerRowCount,
  } as React.CSSProperties;

  // Mobile card layout: first visible column becomes the card title, the next
  // few become labelled meta rows. Filtering/sorting move to a bottom sheet.
  const filterableFields = visibleFields.filter((field) => field.filterable);
  const sortableFields = visibleFields.filter((field) => field.sortable);
  const activeFilterCount = Object.values(filterInputs).filter(
    (value) => value.trim() !== '',
  ).length;
  // Card field resolution: explicit `cardRole` hints win; otherwise the first
  // non-date column becomes the title and the next four become primary rows.
  const cardFields = visibleFields.filter((field) => field.cardRole !== 'hidden');
  const cardTitleField =
    cardFields.find((field) => field.cardRole === 'title') ??
    cardFields.find((field) => field.cardRole !== 'secondary' && !isDateLikeField(field)) ??
    cardFields[0];
  const cardNonTitleFields = cardFields.filter((field) => field !== cardTitleField);
  const explicitPrimaryFields = cardNonTitleFields.filter((field) => field.cardRole === 'primary');
  const cardPrimaryFields =
    explicitPrimaryFields.length > 0
      ? explicitPrimaryFields
      : cardNonTitleFields.filter((field) => field.cardRole !== 'secondary').slice(0, 4);
  const cardSecondaryFields = cardNonTitleFields.filter(
    (field) => !cardPrimaryFields.includes(field),
  );
  const isFullMode = options.mode === 'full' || !options.mode;
  // On full-mode mobile grids the primary "New" action becomes a FAB so the
  // toolbar stays a single compact row.
  const showFab = Boolean(
    isMobile && isFullMode && options.allowAdd && (options.toolbarVisible ?? true),
  );
  const toolbar = buildToolbar(options, t, onAddClick, !showFab);
  const selectionActions = useMemo(() => {
    const bulkSelection =
      options.bulkActions?.map((action, index) => ({
        key: action.key,
        text: action.label,
        icon: action.icon,
        group: 'bulk',
        groupLabel: index === 0 ? t('grid.bulkActionsGroup') : undefined,
        onClick: () => options.onBulkAction?.(action),
      })) ?? [];

    return [...bulkSelection, ...(toolbar.selection ?? [])];
  }, [options.bulkActions, options.onBulkAction, t, toolbar.selection]);
  // Quick search targets the first text-like filterable column. Columns with a
  // formatter are skipped: their displayed text differs from the raw value, so
  // a contains-filter on them would not match what the user sees.
  const quickSearchField = isMobile
    ? filterableFields.find(
        (field) => getDefaultFilterOperator(field) === 'contains' && !field.formatter,
      )
    : undefined;

  const renderRowMenuContent = () => {
    if (!openRowMenu) return null;
    const regular = openRowMenu.actions.filter((a) => a.type !== 'danger');
    const danger = openRowMenu.actions.filter((a) => a.type === 'danger');
    const closeCurrentRowMenu = () => setOpenRowMenu(null);

    return (
      <>
        {regular.map((action, idx) =>
          renderRowActionItem(action, idx, toolbarPermissions, closeCurrentRowMenu),
        )}
        {danger.length > 0 && (
          <div className="nb-datagrid__actions-danger-group">
            {danger.map((action, idx) =>
              renderRowActionItem(action, idx, toolbarPermissions, closeCurrentRowMenu),
            )}
          </div>
        )}
      </>
    );
  };

  const pageStart = totalCount > 0 ? page * pageSize + 1 : 0;
  const pageEnd = totalCount > 0 ? Math.min((page + 1) * pageSize, totalCount) : 0;
  const recordRangeLabel =
    totalCount > 0
      ? t('grid.recordRange', { start: pageStart, end: pageEnd, total: totalCount })
      : t('grid.noRecordCount');
  const selectedCountLabel =
    selectedRows.length > 0 ? t('grid.selectedCount', { count: selectedRows.length }) : null;
  const pageStatusLabel =
    totalPages > 0 ? t('grid.pageStatus', { page: page + 1, total: totalPages }) : null;
  return (
    <div className="view datagrid-list">
      <div
        className={`view-wrapper ${options.mode === 'full' || !options.mode ? 'view-wrapper-datagrid-list list-page' : ''}`}
      >
        <div className={`grid theme-dependent nb-datagrid${options.zebraRows ? ' nb-datagrid--zebra' : ''}`}>
          {options.aboveGrid ? (
            <div className="nb-datagrid__above-grid">{options.aboveGrid}</div>
          ) : null}
          {(options.toolbarVisible ?? true) && options.mode !== 'minimal' && (
            <div className="nb-datagrid__toolbar">
              {options.hasBackButton && (
                <IconButton
                  icon="ph ph-arrow-left"
                  label={t('grid.back')}
                  onClick={() => (options.onBack ? options.onBack() : navigate(-1))}
                />
              )}
              {options.mode === 'full' || !options.mode ? (
                <div className="grid-header">{options.title}</div>
              ) : null}
              {!isMobile && options.beforeToolbar?.()}
              <div className="nb-datagrid__toolbar-spacer" />
              {toolbar.primary
                ?.filter((action) => isToolbarActionVisible(action, toolbarPermissions))
                .map((action, index) => renderToolbarButton(action, index))}
              <SelectionActionsMenu
                actionsLabel={t('grid.buttonActions')}
                selectedCount={selectedRows.length}
                actions={selectionActions}
                permissions={toolbarPermissions}
              />
              {toolbar.utility
                ?.filter((action) => isToolbarActionVisible(action, toolbarPermissions))
                .map((action, index) => renderToolbarButton(action, index, true))}
              {isMobile && (options.filterRow ?? true) && filterableFields.length > 0 && (
                <span className="nb-datagrid__mobile-filter">
                  <IconButton
                    icon="ph ph-funnel"
                    label={t('grid.filters')}
                    onClick={() => setFilterSheetOpen(true)}
                  />
                  {activeFilterCount > 0 && (
                    <span className="nb-datagrid__mobile-filter-badge" aria-hidden="true">
                      {activeFilterCount}
                    </span>
                  )}
                </span>
              )}
              {inlineEditToolbar?.revert && hasPendingInlineEdits && (
                <IconButton
                  className="nb-datagrid__toolbar-icon-action nb-datagrid__toolbar-icon-action--revert"
                  icon="ph ph-arrow-counter-clockwise"
                  label={t('grid.inlineRevertChanges')}
                  onClick={() => inlineEdit.discardAll()}
                />
              )}
              {inlineEditToolbar?.save && hasPendingInlineEdits && (
                <IconButton
                  className="nb-datagrid__toolbar-icon-action nb-datagrid__toolbar-icon-action--save"
                  icon="ph ph-floppy-disk"
                  label={t('grid.inlineSaveChanges')}
                  onClick={() => void inlineEdit.saveAll()}
                />
              )}
              {toolbar.showRefresh !== false && (
                <IconButton
                  icon="ph ph-arrow-clockwise"
                  label={t('grid.buttonRefresh')}
                  onClick={() => void loadRows()}
                />
              )}
            </div>
          )}
          {cellEditMode && hasPendingInlineEdits && !inlineEditToolbar && (
            <div className="nb-datagrid__batch-bar nb-datagrid__batch-bar--compact" role="status">
              <span className="nb-datagrid__batch-bar-label">
                {t('grid.inlineUnsavedRows', { count: dirtyRowCount })}
              </span>
            </div>
          )}
          {isMobile && quickSearchField && (options.filterRow ?? true) && (
            <div className="nb-datagrid__quick-search">
              <i
                className="ph ph-magnifying-glass nb-datagrid__quick-search-icon"
                aria-hidden="true"
              />
              <input
                type="search"
                className="nb-datagrid__quick-search-input"
                placeholder={t('grid.searchPlaceholder', { column: quickSearchField.label })}
                aria-label={t('grid.filterColumn', { column: quickSearchField.label })}
                value={filterInputs[quickSearchField.name] ?? ''}
                onChange={(event) => applyFilterInputDebounced(quickSearchField, event.target.value)}
              />
              {(filterInputs[quickSearchField.name] ?? '') !== '' && (
                <button
                  type="button"
                  className="nb-datagrid__quick-search-clear"
                  aria-label={t('grid.clearFilter')}
                  onClick={() => {
                    const nextInputs = { ...filterInputs };
                    delete nextInputs[quickSearchField.name];
                    applyFilterInputsImmediate(nextInputs);
                  }}
                >
                  <i className="ph ph-x" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          <div className="nb-datagrid__table-wrap" ref={tableWrapRef}>
            {isMobile ? (
              <ul className="nb-datagrid__cards" aria-label={options.title} ref={cardsRef}>
                {rows.length === 0 && isGridLoading
                  ? Array.from({ length: 6 }, (_, i) => (
                      <li
                        key={`card-skeleton-${i}`}
                        className="nb-datagrid__card nb-datagrid__card--skeleton"
                        aria-hidden="true"
                      >
                        <div className="nb-datagrid__skeleton-cell" style={{ width: '55%' }} />
                        <div className="nb-datagrid__skeleton-cell" style={{ width: '85%' }} />
                        <div className="nb-datagrid__skeleton-cell" style={{ width: '70%' }} />
                      </li>
                    ))
                  : rows.map((row, rowIndex) => {
                      const key = row[idField] ?? rowIndex;
                      const selected = selectedKeys.includes(getRowKey(row, rowIndex));
                      const cardActions = buildRowActions(row).filter((a) =>
                        isToolbarActionVisible(a, toolbarPermissions),
                      );
                      const detailFields =
                        typeof options.detailFields === 'function'
                          ? options.detailFields(row)
                          : options.detailFields;
                      const detailUrl = options.detailUrl?.replace('{id}', String(key));
                      const expanded = expandedKeys.has(key);
                      const cardExpanded = expandedCardKeys.has(key);
                      const cardMetaFields = cardExpanded
                        ? [...cardPrimaryFields, ...cardSecondaryFields]
                        : cardPrimaryFields;

                      return (
                        <li
                          key={String(key)}
                          className={`nb-datagrid__card${selected ? ' nb-datagrid__card--selected' : ''}`}
                        >
                          <div
                            className="nb-datagrid__card-body"
                            role="button"
                            tabIndex={0}
                            aria-pressed={selected}
                            onClick={() => selectRow(row)}
                            onDoubleClick={() => openRow(row)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') openRow(row);
                            }}
                          >
                            {hasCheckbox && (
                              <input
                                type="checkbox"
                                className="nb-datagrid__card-check"
                                checked={selected}
                                onChange={() => selectRow(row)}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={t('grid.selectRow')}
                              />
                            )}
                            <div className="nb-datagrid__card-content">
                              {cardTitleField && (
                                <div className="nb-datagrid__card-title">
                                  {renderCell(
                                    cardTitleField,
                                    row,
                                    rowIndex,
                                    0,
                                    filterRemoteOptions[cardTitleField.name],
                                    t('common.yes'),
                                    t('common.no'),
                                  )}
                                </div>
                              )}
                              {cardMetaFields.length > 0 && (
                                <dl className="nb-datagrid__card-meta">
                                  {cardMetaFields.map((field, metaIndex) => (
                                    <div
                                      key={field.name}
                                      className="nb-datagrid__card-meta-row"
                                    >
                                      <dt>{field.label}</dt>
                                      <dd>
                                        {renderCell(
                                          field,
                                          row,
                                          rowIndex,
                                          metaIndex + 1,
                                          filterRemoteOptions[field.name],
                                          t('common.yes'),
                                          t('common.no'),
                                        )}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                              {cardSecondaryFields.length > 0 && (
                                <button
                                  type="button"
                                  className="nb-datagrid__card-more"
                                  aria-expanded={cardExpanded}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setExpandedCardKeys((current) => {
                                      const next = new Set(current);
                                      if (next.has(key)) next.delete(key);
                                      else next.add(key);
                                      return next;
                                    });
                                  }}
                                  onDoubleClick={(event) => event.stopPropagation()}
                                >
                                  <i
                                    className={`ph ${cardExpanded ? 'ph-caret-up' : 'ph-caret-down'}`}
                                    aria-hidden="true"
                                  />
                                  <span>
                                    {cardExpanded ? t('grid.showLess') : t('grid.showMore')}
                                  </span>
                                </button>
                              )}
                            </div>
                            {(cardActions.length > 0 || Boolean(detailUrl && detailFields)) && (
                              <div
                                className="nb-datagrid__card-side"
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => event.stopPropagation()}
                              >
                                {cardActions.length > 0 && (
                                  <IconButton
                                    icon="ph ph-dots-three-vertical"
                                    label={t('grid.buttonActions')}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      const rect = (
                                        event.currentTarget as HTMLElement
                                      ).getBoundingClientRect();
                                      setOpenRowMenu((current) =>
                                        current && current.key === key
                                          ? null
                                          : { key, rect, actions: cardActions },
                                      );
                                    }}
                                  />
                                )}
                                {detailUrl && detailFields && (
                                  <button
                                    type="button"
                                    className={`nb-datagrid__expand-button${expanded ? ' is-expanded' : ''}`}
                                    aria-label={
                                      expanded ? t('grid.collapseDetail') : t('grid.expandDetail')
                                    }
                                    onClick={() => {
                                      setExpandedKeys((current) => {
                                        const next = new Set(current);
                                        if (next.has(key)) next.delete(key);
                                        else next.add(key);
                                        return next;
                                      });
                                    }}
                                  >
                                    <i
                                      className={`ph ${expanded ? 'ph-caret-down' : 'ph-caret-right'}`}
                                      aria-hidden="true"
                                    />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {expanded && detailUrl && detailFields && (
                            <div className="nb-datagrid__card-detail">
                              <DetailGridSection fields={detailFields} url={detailUrl} />
                            </div>
                          )}
                        </li>
                      );
                    })}
              </ul>
            ) : (
            <table
              className={[
                'nb-datagrid__table',
                hasGroupedHeaders ? 'nb-datagrid__table--grouped-headers' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={tableLayoutStyle}
              aria-label={options.title}
              aria-rowcount={totalCount || rows.length}
            >
              <GridColumnGroup
                fields={visibleFields}
                colWidths={resolvedColWidths}
                hasCheckbox={hasCheckbox}
                hasDetail={hasDetail}
                hasRowActions={hasRowActions}
              />
              <thead ref={theadRef}>
                {hasGroupedHeaders ? (
                  <>
                    {columnHeaders.bandRows.map((bandRow, bandRowIndex) => (
                      <tr key={`band-${bandRowIndex}`} className="nb-datagrid__header-band-row">
                        {bandRowIndex === 0 && options.detailFields && (
                          <th
                            rowSpan={headerRowCount}
                            className="nb-datagrid__detail-cell"
                            style={{ top: 0 }}
                          />
                        )}
                        {bandRowIndex === 0 && hasCheckbox && (
                          <th
                            rowSpan={headerRowCount}
                            className="nb-datagrid__select-cell"
                            style={{ top: 0 }}
                          >
                            {renderSelectAllCheckbox()}
                          </th>
                        )}
                        {(() => {
                          let leafOffset = 0;
                          return bandRow.map((cell, cellIndex) => {
                            const rendered = renderGroupHeaderCell(
                              cell,
                              cellIndex,
                              bandRowIndex,
                              bandRow,
                              leafOffset,
                            );
                            if (cell.kind === 'group') {
                              leafOffset += cell.colSpan;
                            }
                            return rendered;
                          });
                        })()}
                        {bandRowIndex === 0 && hasRowActions && (
                          <th
                            rowSpan={headerRowCount}
                            className="nb-datagrid__actions-cell"
                            style={{ top: 0 }}
                          />
                        )}
                      </tr>
                    ))}
                    <tr className="nb-datagrid__header-leaf-row">
                      {options.detailFields && (
                        <th
                          className="nb-datagrid__detail-cell"
                          style={{
                            ...lockColumnWidth(DETAIL_COL_WIDTH),
                            top: `calc(var(--nb-datagrid-header-height) * ${columnHeaders.groupDepth})`,
                          }}
                        />
                      )}
                      {hasCheckbox && (
                        <th
                          className="nb-datagrid__select-cell"
                          style={{
                            ...lockColumnWidth(CHECKBOX_COL_WIDTH),
                            top: `calc(var(--nb-datagrid-header-height) * ${columnHeaders.groupDepth})`,
                          }}
                        />
                      )}
                      {visibleFields.map((field) =>
                        renderFieldHeader(field, {
                          stickyTop: `calc(var(--nb-datagrid-header-height) * ${columnHeaders.groupDepth})`,
                        }),
                      )}
                      {hasRowActions && (
                        <th
                          className="nb-datagrid__actions-cell"
                          style={{
                            ...lockColumnWidth(actionsColWidth),
                            top: `calc(var(--nb-datagrid-header-height) * ${columnHeaders.groupDepth})`,
                          }}
                        />
                      )}
                    </tr>
                  </>
                ) : (
                  <tr>
                    {options.detailFields && <th className="nb-datagrid__detail-cell" />}
                    {hasCheckbox && (
                      <th className="nb-datagrid__select-cell">{renderSelectAllCheckbox()}</th>
                    )}
                    {visibleFields.map((field) => renderFieldHeader(field))}
                    {hasRowActions && <th className="nb-datagrid__actions-cell" />}
                  </tr>
                )}
                {(options.filterRow ?? true) && (
                  <tr className="nb-datagrid__filter-row">
                    {options.detailFields && <td className="nb-datagrid__detail-cell" />}
                    {hasCheckbox && <td className="nb-datagrid__select-cell" />}
                    {visibleFields.map((field) => {
                      const filterCellWidth = getColumnWidth(field, resolvedColWidths);
                      return (
                        <td
                          key={field.name}
                          style={lockColumnWidth(filterCellWidth)}
                          className={
                            [
                              field.filterable === false
                                ? 'nb-datagrid__filter-cell--noop'
                                : '',
                              (filterInputs[field.name] ?? '').trim()
                                ? 'nb-datagrid__filter-cell--active'
                                : '',
                              buildGroupBoundaryClassName(fieldGroupBoundaries[field.name]),
                            ]
                              .filter(Boolean)
                              .join(' ') || undefined
                          }
                        >
                          {field.filterable ? renderFilterCell(field) : null}
                        </td>
                      );
                    })}
                    {hasRowActions && <td className="nb-datagrid__actions-cell" />}
                  </tr>
                )}
                {options.errorMessage && (
                  <tr className="nb-datagrid__error-row">
                    <td colSpan={colSpan}>
                      <div className="nb-datagrid__error-message" role="alert">
                        <i className="ph ph-warning-circle" aria-hidden="true" />
                        <span>{options.errorMessage}</span>
                        {options.onDismissError && (
                          <button
                            type="button"
                            className="nb-datagrid__error-close"
                            aria-label={t('dialog.close')}
                            onClick={options.onDismissError}
                          >
                            <i className="ph ph-x" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </thead>
              <tbody ref={tbodyRef}>
                {rows.length === 0 && isGridLoading ? (
                  Array.from({ length: 7 }, (_, i) => (
                    <tr key={`skeleton-${i}`} className="nb-datagrid__skeleton-row">
                      {options.detailFields && <td className="nb-datagrid__detail-cell" />}
                      {hasCheckbox && (
                        <td className="nb-datagrid__select-cell">
                          <div
                            className="nb-datagrid__skeleton-cell"
                            style={{ width: 16, height: 16 }}
                          />
                        </td>
                      )}
                      {visibleFields.map((field) => (
                        <td key={field.name}>
                          <div className="nb-datagrid__skeleton-cell" />
                        </td>
                      ))}
                      {hasRowActions && <td className="nb-datagrid__actions-cell" />}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="nb-datagrid__empty-td" />
                  </tr>
                ) : (
                  rows.map((row, rowIndex) => {
                    const key = row[idField] ?? rowIndex;
                    const selected = selectedKeys.includes(getRowKey(row, rowIndex));
                    const editing = inlineEdit.draftRows.has(key);
                    const rowHasChanges = editing && inlineEdit.hasDraftChanges(key, row);
                    const saving = inlineEdit.savingRows.has(key);
                    const rowDraft = inlineEdit.draftRows.get(key) ?? row;
                    const rowFieldErrors = inlineEdit.rowErrors.get(key);
                    const rowInRowEdit = rowInlineMode && editing;
                    const detailFields =
                      typeof options.detailFields === 'function'
                        ? options.detailFields(row)
                        : options.detailFields;
                    const detailUrl = options.detailUrl?.replace('{id}', String(key));
                    const expanded = expandedKeys.has(key);
                    const rowActions: ResourceToolbarAction[] = buildRowActions(row);

                    return (
                      <React.Fragment key={String(key)}>
                        <tr
                          className={[
                            'nb-datagrid__row',
                            expanded ? 'nb-datagrid__row--expanded' : '',
                            selected ? 'nb-datagrid__row--selected' : '',
                            rowInRowEdit ? 'nb-datagrid__row--editing' : '',
                            rowHasChanges ? 'nb-datagrid__row--dirty' : '',
                            saving ? 'nb-datagrid__row--saving' : '',
                          ].filter(Boolean).join(' ')}
                          tabIndex={0}
                          aria-selected={selected}
                          onClick={() => {
                            if (rowInRowEdit) return;
                            selectRow(row);
                          }}
                          onDoubleClick={() => {
                            if (rowInRowEdit || inlineEdit.activeCell) return;
                            if (options.allowEdit && rowEditable(row) && rowInlineMode && canInlineEditMode) {
                              inlineEdit.startEdit(row);
                              return;
                            }
                            if (options.allowEdit && (options.onEdit || options.events?.EDIT)) {
                              if (options.onEdit) options.onEdit(row);
                              else emit(options.events!.EDIT!, { row });
                              return;
                            }
                            if (options.allowView && options.onView) {
                              options.onView(row);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (inlineEdit.activeCell && event.key === 'Escape') {
                              inlineEdit.stopCellEdit();
                            } else if (rowInRowEdit && event.key === 'Escape') {
                              inlineEdit.cancelEdit(key);
                            } else if (rowInRowEdit && event.key === 'Enter' && showRowInlineActions) {
                              void inlineEdit.saveRow(key);
                            } else if (
                              !editing &&
                              event.key === 'Enter' &&
                              options.allowEdit &&
                              rowInlineMode &&
                              canInlineEditMode &&
                              rowEditable(row)
                            ) {
                              inlineEdit.startEdit(row);
                            } else if (
                              !editing &&
                              event.key === 'Enter' &&
                              options.allowEdit &&
                              (options.onEdit || options.events?.EDIT)
                            ) {
                              if (options.onEdit) options.onEdit(row);
                              else emit(options.events!.EDIT!, { row });
                            } else if (
                              !editing &&
                              event.key === 'Enter' &&
                              options.allowView &&
                              options.onView
                            ) {
                              options.onView(row);
                            } else if (
                              !editing &&
                              event.key === 'Delete' &&
                              options.allowDelete &&
                              (options.onDelete || options.events?.DELETE)
                            ) {
                              setConfirmRow(row);
                            } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                              event.preventDefault();
                              const allRows = event.currentTarget
                                .closest('tbody')
                                ?.querySelectorAll<HTMLTableRowElement>('tr.nb-datagrid__row');
                              if (!allRows) return;
                              const idx = Array.from(allRows).indexOf(event.currentTarget);
                              const next = allRows[event.key === 'ArrowUp' ? idx - 1 : idx + 1];
                              if (next) {
                                next.focus();
                                selectRow(rows[event.key === 'ArrowUp' ? idx - 1 : idx + 1]);
                              }
                            }
                          }}
                        >
                          {options.detailFields && (
                            <td className="nb-datagrid__detail-cell">
                              {detailUrl && detailFields && (
                                <button
                                  type="button"
                                  className={`nb-datagrid__expand-button${expanded ? ' is-expanded' : ''}`}
                                  aria-label={
                                    expanded ? t('grid.collapseDetail') : t('grid.expandDetail')
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setExpandedKeys((current) => {
                                      const next = new Set(current);
                                      if (next.has(key)) next.delete(key);
                                      else next.add(key);
                                      return next;
                                    });
                                  }}
                                >
                                  <i
                                    className={`ph ${expanded ? 'ph-caret-down' : 'ph-caret-right'}`}
                                    aria-hidden="true"
                                  />
                                </button>
                              )}
                            </td>
                          )}
                          {hasCheckbox && (
                            <td className="nb-datagrid__select-cell">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => selectRow(row)}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={t('grid.selectRow')}
                              />
                            </td>
                          )}
                          {visibleFields.map((field, columnIndex) => {
                            const width = getColumnWidth(field, resolvedColWidths);
                            const editable =
                              options.allowEdit &&
                              !options.editDisabled &&
                              rowEditable(row) &&
                              canEditFieldInline(field);
                            const cellActive = inlineEdit.isCellActive(key, field.name);
                            const cellDirty = editing && inlineEdit.isCellDirty(key, field.name, row);
                            const showCellEditor =
                              editable &&
                              ((rowInRowEdit && editing) || (cellEditMode && cellActive));
                            const displayRow = editing ? rowDraft : row;
                            const cellClassName = [
                              showCellEditor ? 'nb-datagrid__edit-cell' : 'nb-datagrid__data-cell',
                              editable && canInlineEditMode ? 'nb-datagrid__cell--editable' : '',
                              cellDirty ? 'nb-datagrid__cell--dirty' : '',
                              cellActive ? 'nb-datagrid__cell--active' : '',
                              buildGroupBoundaryClassName(fieldGroupBoundaries[field.name]),
                            ]
                              .filter(Boolean)
                              .join(' ');

                            const beginInlineEdit = () => {
                              if (!editable) return;
                              selectRow(row);
                              if (cellEditMode) {
                                inlineEdit.startCellEdit(row, field.name);
                              } else if (rowInlineMode && !editing) {
                                inlineEdit.startEdit(row);
                              }
                            };

                            if (showCellEditor) {
                              return (
                                <td
                                  key={field.name}
                                  style={{ ...lockColumnWidth(width), textAlign: field.align }}
                                  className={cellClassName}
                                >
                                  <InlineEditCell
                                    field={field}
                                    rowKey={key}
                                    draft={rowDraft}
                                    onChange={(name, value) =>
                                      inlineEdit.updateDraft(key, name, value)
                                    }
                                    errors={rowFieldErrors}
                                    disabled={saving}
                                    allRemoteOptions={filterRemoteOptions}
                                    httpClient={httpClient}
                                    t={t}
                                    autoFocus
                                  />
                                </td>
                              );
                            }

                            return (
                              <td
                                key={field.name}
                                style={{ ...lockColumnWidth(width), textAlign: field.align }}
                                className={cellClassName}
                                title={getCellText(
                                  field,
                                  displayRow,
                                  filterRemoteOptions[field.name],
                                  t('common.yes'),
                                  t('common.no'),
                                )}
                                onClick={(event) => {
                                  if (!editable || !canInlineEditMode) return;
                                  event.stopPropagation();
                                  beginInlineEdit();
                                }}
                              >
                                {renderCell(
                                  field,
                                  displayRow,
                                  rowIndex,
                                  columnIndex,
                                  filterRemoteOptions[field.name],
                                  t('common.yes'),
                                  t('common.no'),
                                )}
                              </td>
                            );
                          })}
                          {hasRowActions && (
                            <td
                              className="nb-datagrid__actions-cell"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {rowInRowEdit && showRowInlineActions ? (
                                <div className="nb-datagrid__inline-actions">
                                  <button
                                    type="button"
                                    className="nb-datagrid__inline-btn nb-datagrid__inline-btn--save"
                                    disabled={saving}
                                    aria-label={t('grid.inlineSaveRow')}
                                    title={t('grid.inlineSaveRow')}
                                    onClick={() => void inlineEdit.saveRow(key)}
                                  >
                                    <i className="ph ph-check" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="nb-datagrid__inline-btn nb-datagrid__inline-btn--cancel"
                                    disabled={saving}
                                    aria-label={t('grid.inlineCancelRow')}
                                    title={t('grid.inlineCancelRow')}
                                    onClick={() => inlineEdit.cancelEdit(key)}
                                  >
                                    <i className="ph ph-x" aria-hidden="true" />
                                  </button>
                                </div>
                              ) : (
                                <div className="nb-datagrid__row-actions">
                                  {rowActions.length > 0 && (
                                    <IconButton
                                      icon="ph ph-dots-three-vertical"
                                      label={t('grid.buttonActions')}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect = (
                                          e.currentTarget as HTMLElement
                                        ).getBoundingClientRect();
                                        const rowKey = key;

                                        // Resolve actions at click time (avoids fragile re-lookup later)
                                        const actionsAtOpen: ResourceToolbarAction[] = buildRowActions(
                                          row,
                                        ).filter((a) => isToolbarActionVisible(a, toolbarPermissions));

                                        setOpenRowMenu((current) =>
                                          current && current.key === rowKey
                                            ? null
                                            : { key: rowKey, rect, actions: actionsAtOpen },
                                        );
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                        {expanded && detailUrl && detailFields && (
                          <tr className="nb-datagrid__detail-row">
                            <td colSpan={colSpan}>
                              <DetailGridSection fields={detailFields} url={detailUrl} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              <SummaryFooter
                fields={visibleFields}
                hasCheckbox={hasCheckbox}
                hasDetail={hasDetail}
                hasRowActions={hasRowActions}
                rows={rows}
                summaryFields={options.summaryFields}
                gridSummary={gridSummary}
                footerRef={tfootRef}
                colWidths={resolvedColWidths}
              />
            </table>
            )}
            {rows.length === 0 && !isGridLoading && (
              <GridEmptyStateView
                emptyState={options.emptyState}
                fallbackTitle={t('grid.noRecords')}
              />
            )}
            {!isMobile && (
              <div
                ref={hScrollRef}
                className={`nb-datagrid__hscroll${layoutWidth > containerWidth ? '' : ' nb-datagrid__hscroll--hidden'}`}
                aria-hidden="true"
                tabIndex={-1}
              >
                <div className="nb-datagrid__hscroll-inner" style={{ width: layoutWidth }} />
              </div>
            )}
            {isGridLoading && rows.length > 0 && (
              <div className="nb-datagrid__loading-overlay" aria-live="polite">
                <div className="nb-datagrid__loading-card">
                  {loadingMessage || t('grid.loading')}
                </div>
              </div>
            )}
          </div>
          {isMobile && (options.summaryFields?.length ?? 0) > 0 && rows.length > 0 && (
            <div className="nb-datagrid__card-summary">
              {options.summaryFields!.map((item, index) => (
                <div key={index} className="nb-datagrid__card-summary-item">
                  {item.label && (
                    <span className="nb-datagrid__summary-label">{item.label}</span>
                  )}
                  <span className="nb-datagrid__summary-value">
                    {item.column && gridSummary && item.column in gridSummary
                      ? formatSummaryValue(gridSummary[item.column], item)
                      : resolveSummaryText(rows, item)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {showFab && (
            <button
              type="button"
              className="nb-datagrid__fab"
              aria-label={t('grid.buttonNew')}
              disabled={options.addDisabled}
              onClick={onAddClick}
            >
              <i className="ph ph-plus" aria-hidden="true" />
            </button>
          )}
          {(options.paging ?? true) && (
            <div className="nb-datagrid__pager">
              <div className="nb-datagrid__pager-status" aria-live="polite">
                <span className="nb-datagrid__pager-info">{recordRangeLabel}</span>
                {selectedCountLabel && (
                  <span className="nb-datagrid__pager-selected">{selectedCountLabel}</span>
                )}
                {pageStatusLabel && (
                  <span className="nb-datagrid__pager-page-status">{pageStatusLabel}</span>
                )}
              </div>
              <div className="nb-datagrid__pager-nav">
                <button
                  type="button"
                  className="nb-datagrid__pager-btn"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  aria-label={t('grid.firstPage')}
                >
                  <i className="ph ph-caret-double-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="nb-datagrid__pager-btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label={t('grid.previousPage')}
                >
                  <i className="ph ph-caret-left" aria-hidden="true" />
                </button>
                {getPageRange(page, totalPages).map((pageNum, i) =>
                  pageNum === null ? (
                    <span key={`ellipsis-${i}`} className="nb-datagrid__pager-ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      type="button"
                      className={`nb-datagrid__pager-btn nb-datagrid__pager-btn--page${pageNum === page ? ' is-current' : ''}`}
                      onClick={() => setPage(pageNum)}
                      aria-current={pageNum === page ? 'page' : undefined}
                    >
                      {pageNum + 1}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="nb-datagrid__pager-btn"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page + 1 >= totalPages}
                  aria-label={t('grid.nextPage')}
                >
                  <i className="ph ph-caret-right" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="nb-datagrid__pager-btn"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page + 1 >= totalPages}
                  aria-label={t('grid.lastPage')}
                >
                  <i className="ph ph-caret-double-right" aria-hidden="true" />
                </button>
              </div>
              <div
                className="nb-datagrid__pager-size"
                role="group"
                aria-labelledby="nb-datagrid-page-size-label"
              >
                <span
                  className="nb-datagrid__pager-size-label"
                  id="nb-datagrid-page-size-label"
                >
                  {t('grid.rowsPerPage')}
                </span>
                <AppDropdown
                  id="nb-datagrid-page-size"
                  value={String(pageSize)}
                  options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                  onChange={(value) => {
                    setPageSize(Number(value));
                    setPage(0);
                  }}
                  variant="compact"
                  showFieldLabel={false}
                />
              </div>
            </div>
          )}
          <ConfirmDialog
            open={Boolean(confirmRow)}
            title={t('dialog.confirmDeleteTitle')}
            message={t('dialog.confirmDelete')}
            variant="danger"
            cancelLabel={t('dialog.buttonCancel')}
            confirmLabel={t('grid.buttonDelete')}
            onCancel={() => setConfirmRow(null)}
            onConfirm={confirmDelete}
          />
          {openRowMenu &&
            createPortal(
              isMobile ? (
                <div className="nb-datagrid__sheet-root">
                  <button
                    type="button"
                    className="nb-datagrid__sheet-scrim"
                    aria-label={t('dialog.buttonCancel')}
                    onClick={closeRowMenu}
                  />
                  <div
                    className="nb-datagrid__row-actions-popover nb-datagrid__row-actions-popover--sheet"
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderRowMenuContent()}
                  </div>
                </div>
              ) : (
                <div
                  className="nb-datagrid__row-actions-popover"
                  role="menu"
                  style={{
                    position: 'fixed',
                    // Anchor the right edge of the menu to the right edge of the ⋮ button.
                    // This makes the menu open to the left, which is what we want when the
                    // actions column is the last column on the right of a wide table.
                    right: `${Math.max(0, window.innerWidth - openRowMenu.rect.right + 4)}px`,
                    top: (() => {
                      const menuHeightEstimate = 180;
                      const wouldOverflowBottom =
                        openRowMenu.rect.bottom + menuHeightEstimate > window.innerHeight;
                      if (wouldOverflowBottom) {
                        return `${openRowMenu.rect.top - menuHeightEstimate - 8}px`;
                      }
                      return `${openRowMenu.rect.bottom + 4}px`;
                    })(),
                    zIndex: 'var(--z-popover)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderRowMenuContent()}
                </div>
              ),
              document.body,
            )}
          {isMobile &&
            filterSheetOpen &&
            createPortal(
              <div
                className="nb-datagrid__sheet-root"
                role="dialog"
                aria-modal="true"
                aria-label={t('grid.filters')}
              >
                <button
                  type="button"
                  className="nb-datagrid__sheet-scrim"
                  aria-label={t('grid.done')}
                  onClick={() => setFilterSheetOpen(false)}
                />
                <div className="nb-datagrid__sheet">
                  <div className="nb-datagrid__sheet-header">
                    <span className="nb-datagrid__sheet-title">{t('grid.filters')}</span>
                    <IconButton
                      icon="ph ph-x"
                      label={t('grid.done')}
                      onClick={() => setFilterSheetOpen(false)}
                    />
                  </div>
                  <div className="nb-datagrid__sheet-body">
                    {options.beforeToolbar && (
                      <div className="nb-datagrid__sheet-field nb-datagrid__sheet-presets">
                        {options.beforeToolbar()}
                      </div>
                    )}
                    {sortableFields.length > 0 && (
                      <div className="nb-datagrid__sheet-field">
                        <span className="nb-datagrid__sheet-label">{t('grid.sortBy')}</span>
                        <div className="nb-datagrid__sheet-sort">
                          <AppDropdown
                            id="nb-datagrid-mobile-sort"
                            value={sort[0]?.selector ?? ''}
                            options={[
                              { value: '', label: t('grid.sortNone') },
                              ...sortableFields.map((field) => ({
                                value: field.name,
                                label: field.label,
                              })),
                            ]}
                            onChange={(value) => {
                              setPage(0);
                              setSort(
                                value ? [{ selector: value, desc: sort[0]?.desc ?? false }] : [],
                              );
                            }}
                            showFieldLabel={false}
                          />
                          <IconButton
                            icon={`ph ${sort[0]?.desc ? 'ph-sort-descending' : 'ph-sort-ascending'}`}
                            label={
                              sort[0]?.desc ? t('grid.sortDescending') : t('grid.sortAscending')
                            }
                            disabled={!sort[0]}
                            onClick={() => {
                              setPage(0);
                              setSort((current) =>
                                current[0]
                                  ? [{ selector: current[0].selector, desc: !current[0].desc }]
                                  : current,
                              );
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {filterableFields.map((field) => (
                      <div key={field.name} className="nb-datagrid__sheet-field">
                        <span className="nb-datagrid__sheet-label">{field.label}</span>
                        {renderFilterCell(field)}
                      </div>
                    ))}
                  </div>
                  <div className="nb-datagrid__sheet-footer">
                    <Button
                      variant="secondary"
                      onClick={() => applyFilterInputsImmediate({})}
                      disabled={activeFilterCount === 0}
                    >
                      {t('grid.clearFilters')}
                    </Button>
                    <Button variant="primary" onClick={() => setFilterSheetOpen(false)}>
                      {t('grid.done')}
                    </Button>
                  </div>
                </div>
              </div>,
              document.body,
            )}
        </div>
      </div>
    </div>
  );
});

NativeDataGridView.displayName = 'NativeDataGridView';
