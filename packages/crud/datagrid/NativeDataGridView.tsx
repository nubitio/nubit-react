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
import { useEvents, useCoreHttpClient, useCoreTranslation } from '@nubitio/core';
import { DATA_GRID_EVENTS } from './DataGridEvents';
import type { DataGridSummaryItem, DataGridViewOptions } from './DataGridViewOptions';
import type { GridHandle } from './GridHandle';
import type { FilterRule } from '../field/FilterRule';
import type { ResourceToolbarAction, ResourceToolbarItems } from '../crud/ResourceConfig';
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
import { GridEmptyStateView } from './GridEmptyStateView';
import { BETWEEN_VALUE_SEPARATOR, splitBetweenValue } from '../field/registry/shared';
import { formatSummaryValue, resolveSummaryText } from '../summary';
import { useIsMobile } from './useIsMobile';

type SortRule = { selector: string; desc: boolean };

const DETAIL_COL_WIDTH = 36;
const CHECKBOX_COL_WIDTH = 36;
const ACTIONS_COL_WIDTH = 44;
const DEFAULT_COL_WIDTH = 120;
const MIN_COL_WIDTH = 48;

function getColumnWidth(field: Field, colWidths: Record<string, number>): number {
  return colWidths[field.name] ?? field.width ?? field.minWidth ?? DEFAULT_COL_WIDTH;
}

function computeLayoutWidth({
  visibleFields,
  colWidths,
  hasCheckbox,
  hasDetail,
  hasRowActions,
  containerWidth,
}: {
  visibleFields: Field[];
  colWidths: Record<string, number>;
  hasCheckbox: boolean;
  hasDetail: boolean;
  hasRowActions: boolean;
  containerWidth: number;
}): number {
  let total = 0;
  if (hasDetail) total += DETAIL_COL_WIDTH;
  if (hasCheckbox) total += CHECKBOX_COL_WIDTH;
  visibleFields.forEach((field) => {
    total += getColumnWidth(field, colWidths);
  });
  if (hasRowActions) total += ACTIONS_COL_WIDTH;
  return Math.max(containerWidth, total);
}

function GridColumnGroup({
  fields,
  colWidths,
  hasCheckbox,
  hasDetail,
  hasRowActions,
}: {
  fields: Field[];
  colWidths: Record<string, number>;
  hasCheckbox: boolean;
  hasDetail: boolean;
  hasRowActions: boolean;
}) {
  return (
    <colgroup>
      {hasDetail && <col className="nb-datagrid__detail-col" />}
      {hasCheckbox && <col className="nb-datagrid__checkbox-col" />}
      {fields.map((field) => (
        <col key={field.name} style={{ width: getColumnWidth(field, colWidths) }} />
      ))}
      {hasRowActions && <col className="nb-datagrid__actions-col" />}
    </colgroup>
  );
}

function getPageRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const result: (number | null)[] = [0];
  if (current > 3) result.push(null);
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) result.push(i);
  if (current < total - 4) result.push(null);
  result.push(total - 1);
  return result;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function normalizeIcon(icon?: string): string | undefined {
  if (!icon) return undefined;
  return icon.includes('ph ') || icon.startsWith('ph-') ? icon : `ph-${icon}`;
}

function isDateLikeField(field: Field): boolean {
  return field.type === FieldType.DATE || field.type === FieldType.DATETIME;
}

function getToolbarKey(action: ResourceToolbarAction, index: number): string {
  return action.key ?? action.text ?? String(index);
}

function renderToolbarButton(action: ResourceToolbarAction, index: number, iconOnly = false) {
  if (action.visible === false) return null;
  const icon = normalizeIcon(action.icon);
  const variant =
    action.type === 'danger' ? 'danger' : action.type === 'primary' ? 'primary' : 'secondary';
  if (iconOnly) {
    return (
      <IconButton
        key={getToolbarKey(action, index)}
        className="nb-datagrid__toolbar-icon-action"
        icon={icon ? `ph ${icon}` : 'ph ph-circle'}
        label={action.hint ?? action.text ?? ''}
        onClick={action.onClick}
        disabled={action.disabled}
      />
    );
  }

  return (
    <Button
      key={getToolbarKey(action, index)}
      variant={variant}
      size="sm"
      icon={icon ? `ph ${icon}` : undefined}
      onClick={action.onClick}
      disabled={action.disabled}
      title={action.hint}
      aria-label={action.hint ?? action.text}
    >
      {action.text && <span>{action.text}</span>}
    </Button>
  );
}

function isToolbarActionVisible(action: ResourceToolbarAction, permissions: string[]): boolean {
  if (action.visible === false) return false;
  if (!action.permission) return true;
  return permissions.includes(action.permission);
}

function renderSelectionActionItem(
  action: ResourceToolbarAction,
  index: number,
  disabled: boolean,
  onBeforeClick?: () => void,
) {
  const icon = normalizeIcon(action.icon);
  return (
    <button
      key={getToolbarKey(action, index)}
      type="button"
      className={`nb-datagrid__actions-item${action.type === 'danger' ? ' nb-datagrid__actions-item--danger' : ''}`}
      onClick={() => {
        onBeforeClick?.();
        action.onClick?.();
      }}
      disabled={disabled || action.disabled}
      role="menuitem"
    >
      {icon && <i className={`ph ${icon}`} aria-hidden="true" />}
      <span>{action.text}</span>
    </button>
  );
}

function getResolvedRowActions(
  row: DataRecord,
  rowActions: DataGridViewOptions['rowActions'],
): ResourceToolbarAction[] {
  if (!rowActions) return [];
  return typeof rowActions === 'function' ? rowActions(row) : rowActions;
}

function renderRowActionItem(
  action: ResourceToolbarAction,
  index: number,
  permissions: string[],
  onBeforeClick?: () => void,
) {
  if (!isToolbarActionVisible(action, permissions)) return null;
  return renderSelectionActionItem(action, index, false, onBeforeClick);
}

// Shared event name with NativeFormView so lookup dropdowns and the actions
// menu close each other (single open dropdown invariant across the whole page).
const DROPDOWN_OPENED_EVENT = 'lookup:opened';

function SelectionActionsMenu({
  actionsLabel,
  selectedCount,
  actions = [],
  permissions,
}: {
  actionsLabel: string;
  selectedCount: number;
  actions?: ResourceToolbarAction[];
  permissions: string[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<symbol>(Symbol());

  const visibleActions = actions.filter((action) => isToolbarActionVisible(action, permissions));
  const disabled = selectedCount === 0;

  // Close on mousedown outside the container.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Mutual exclusion: close when any lookup/dropdown opens.
  useEffect(() => {
    const id = idRef.current;
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ id: symbol }>).detail.id !== id) setOpen(false);
    };
    document.addEventListener(DROPDOWN_OPENED_EVENT, handler);
    return () => document.removeEventListener(DROPDOWN_OPENED_EVENT, handler);
  }, []);

  if (visibleActions.length === 0) return null;

  const dangerActions = visibleActions.filter((action) => action.type === 'danger');
  const regularActions = visibleActions.filter((action) => action.type !== 'danger');
  const groups = regularActions.reduce<Record<string, ResourceToolbarAction[]>>((acc, action) => {
    const group = action.group ?? 'default';
    acc[group] = acc[group] ?? [];
    acc[group].push(action);
    return acc;
  }, {});

  const label = selectedCount > 0 ? `${actionsLabel} (${selectedCount})` : actionsLabel;

  const handleToggle = () => {
    if (disabled) return;
    const next = !open;
    if (next) {
      document.dispatchEvent(
        new CustomEvent<{ id: symbol }>(DROPDOWN_OPENED_EVENT, { detail: { id: idRef.current } }),
      );
    }
    setOpen(next);
  };

  return (
    <div ref={containerRef} className="nb-datagrid__actions-menu">
      <Button
        variant="secondary"
        aria-disabled={disabled}
        aria-expanded={open}
        onClick={handleToggle}
      >
        <span>{label}</span>
        <i className="ph ph-caret-down" aria-hidden="true" />
      </Button>
      {open && !disabled && (
        <div className="nb-datagrid__actions-popover" role="menu">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="nb-datagrid__actions-group">
              {items.length > 1 && items[0]?.groupLabel && (
                <div className="nb-datagrid__actions-group-label">{items[0].groupLabel}</div>
              )}
              {items.map((action, index) =>
                renderSelectionActionItem(action, index, disabled, () => setOpen(false)),
              )}
            </div>
          ))}
          {dangerActions.length > 0 && (
            <div className="nb-datagrid__actions-danger-group">
              {dangerActions.map((action, index) =>
                renderSelectionActionItem(action, index, disabled, () => setOpen(false)),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildToolbar(
  options: DataGridViewOptions,
  t: ReturnType<typeof useCoreTranslation>['t'],
  onAddClick: () => void,
  includeAddAction = true,
): ResourceToolbarItems {
  return {
    primary: [
      ...(options.allowAdd && includeAddAction
        ? [
            {
              text: t('grid.buttonNew'),
              icon: 'ph-plus',
              type: 'primary' as const,
              onClick: onAddClick,
              disabled: options.addDisabled,
            },
          ]
        : []),
      ...(options.toolbar?.primary ?? []),
    ],
    selection: options.toolbar?.selection,
    utility: options.toolbar?.utility,
    showRefresh: options.toolbar?.showRefresh ?? true,
  };
}


function SummaryFooter({
  fields,
  hasCheckbox,
  hasDetail,
  hasRowActions,
  rows,
  summaryFields,
  gridSummary,
  footerRef,
  colWidths,
}: {
  fields: Field[];
  hasCheckbox: boolean;
  hasDetail: boolean;
  hasRowActions: boolean;
  rows: DataRecord[];
  summaryFields?: DataGridSummaryItem[];
  gridSummary?: Record<string, unknown> | null;
  footerRef?: React.Ref<HTMLTableSectionElement>;
  colWidths: Record<string, number>;
}) {
  if (!summaryFields?.length) return null;

  const itemsByColumn = new Map(
    summaryFields.filter((item) => item.column).map((item) => [item.column, item]),
  );
  const unboundItems = summaryFields.filter((item) => !item.column);
  const fallbackFieldName = fields[fields.length - 1]?.name;

  return (
    <tfoot ref={footerRef} className="nb-datagrid__summary-footer">
      <tr>
        {hasDetail && <td className="nb-datagrid__detail-cell" />}
        {hasCheckbox && <td className="nb-datagrid__select-cell" />}
        {fields.map((field) => {
          const item =
            itemsByColumn.get(field.name) ??
            (field.name === fallbackFieldName ? unboundItems[0] : undefined);
          const align = item?.align ?? field.align;
          const justifyContent =
            align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
          return (
            <td
              key={field.name}
              style={{ width: getColumnWidth(field, colWidths), textAlign: align }}
            >
              {item && (
                <div className="nb-datagrid__summary-cell" style={{ justifyContent }}>
                  {item.label && (
                    <span className="nb-datagrid__summary-label">{item.label}</span>
                  )}
                  <span className="nb-datagrid__summary-value">
                    {item.column && gridSummary && item.column in gridSummary
                      ? formatSummaryValue(gridSummary[item.column], item)
                      : resolveSummaryText(rows, item)}
                  </span>
                </div>
              )}
            </td>
          );
        })}
        {hasRowActions && <td className="nb-datagrid__actions-cell" />}
      </tr>
    </tfoot>
  );
}

export const NativeDataGridView = forwardRef<GridHandle, DataGridViewOptions>((options, ref) => {
  const { t } = useCoreTranslation();
  const httpClient = useCoreHttpClient();
  const resourceStoreFactory = useResourceStoreFactory();
  const toolbarPermissions = useSmartCrudRoles();
  const navigate = useNavigate();
  const [on, emit] = useEvents();
  const idField = useMemo(() => getIdField(options.fields), [options.fields]);
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
  const [selectedKeys, setSelectedKeys] = useState<unknown[]>([]);
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

    tbody.addEventListener('scroll', onBodyScroll, { passive: true });
    hScroll?.addEventListener('scroll', onFooterScroll, { passive: true });

    const layoutObserver = new ResizeObserver(() => clampAndSync());
    layoutObserver.observe(tbody);
    if (thead) layoutObserver.observe(thead);
    if (tfoot) layoutObserver.observe(tfoot);

    return () => {
      tbody.removeEventListener('scroll', onBodyScroll);
      hScroll?.removeEventListener('scroll', onFooterScroll);
      layoutObserver.disconnect();
    };
  }, [rows.length, visibleFields.length, colWidths, containerWidth, options.summaryFields?.length]);

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

  const loadRows = useCallback(async () => {
    if (options.manualLoad) return rowsRef.current;
    setIsGridLoading(true);
    const loadOptions: ResourceLoadOptions = {
      filter: buildFilterExpression(filters, filterOperators, fieldsRef.current),
      sort,
    };
    if (options.paging ?? true) {
      loadOptions.skip = page * pageSize;
      loadOptions.take = pageSize;
    }

    const result = await source.load(loadOptions);
    rowsRef.current = result.data;
    setRows(result.data);
    setTotalCount(result.totalCount);
    setGridSummary(result.gridSummary ?? null);
    setIsGridLoading(false);
    onContentReadyRef.current?.();
    return result.data;
  }, [filterOperators, filters, options.manualLoad, options.paging, page, pageSize, sort, source]);

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

  // Snapshot of mutable state read by the imperative handle. Updated after every render
  // so handle methods always see current values without the handle itself being rebuilt.
  const handleStateRef = useRef({ selectedKeys, filters, filterOperators, loadRows, idField });
  handleStateRef.current = { selectedKeys, filters, filterOperators, loadRows, idField }; // eslint-disable-line react-hooks/refs

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
          handleStateRef.current.selectedKeys.includes(row[handleStateRef.current.idField]),
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
    }),
    [options.fields, t],
  );

  const selectedRows = rows.filter((row) => selectedKeys.includes(row[idField]));

  const selectRow = (row: DataRecord) => {
    const key = row[idField];
    const nextKeys =
      options.selectionMode === 'multiple'
        ? selectedKeys.includes(key)
          ? selectedKeys.filter((selectedKey) => selectedKey !== key)
          : [...selectedKeys, key]
        : [key];

    setSelectedKeys(nextKeys);
    const nextRows = rows.filter((item) => nextKeys.includes(item[idField]));
    options.onSelectionChanged?.({ selectedRowsData: nextRows });
    emit(DATA_GRID_EVENTS.SELECTION_CHANGED, nextRows);
  };

  const rowEditable = (row: DataRecord): boolean => options.canEditRow?.(row) !== false;
  const rowDeletable = (row: DataRecord): boolean => options.canDeleteRow?.(row) !== false;

  const buildRowActions = (row: DataRecord): ResourceToolbarAction[] => [
    ...(options.allowEdit && rowEditable(row) && (options.onEdit || options.events?.EDIT)
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
  const hasBuiltInRowActions = Boolean(
    (options.allowEdit && (options.onEdit || options.events?.EDIT)) ||
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
  const layoutWidth = computeLayoutWidth({
    visibleFields,
    colWidths,
    hasCheckbox,
    hasDetail,
    hasRowActions,
    containerWidth,
  });

  // Distribute container space proportionally among data columns only.
  // The actions column (fixed UI chrome) is excluded from stretching — it always
  // stays at ACTIONS_COL_WIDTH regardless of how wide the container gets.
  const resolvedColWidths = useMemo(() => {
    if (visibleFields.length === 0) return colWidths;
    const dataTotal = visibleFields.reduce((sum, f) => sum + getColumnWidth(f, colWidths), 0);
    const fixedTotal =
      (hasCheckbox ? CHECKBOX_COL_WIDTH : 0) +
      (hasDetail ? DETAIL_COL_WIDTH : 0) +
      (hasRowActions ? ACTIONS_COL_WIDTH : 0);
    const extra = Math.max(0, containerWidth - dataTotal - fixedTotal);
    if (extra === 0 || dataTotal === 0) return colWidths;
    let distributed = 0;
    const result: Record<string, number> = {};
    visibleFields.forEach((f, i) => {
      const base = getColumnWidth(f, colWidths);
      const share =
        i < visibleFields.length - 1 ? Math.round(extra * (base / dataTotal)) : extra - distributed; // give remainder to last col to avoid rounding gaps
      result[f.name] = base + share;
      distributed += share;
    });
    return result;
  }, [visibleFields, colWidths, hasCheckbox, hasDetail, hasRowActions, containerWidth]);

  const tableLayoutStyle = {
    '--nb-datagrid-layout-width': `${layoutWidth}px`,
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
                actions={toolbar.selection}
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
              {toolbar.showRefresh !== false && (
                <IconButton
                  icon="ph ph-arrow-clockwise"
                  label={t('grid.buttonRefresh')}
                  onClick={() => void loadRows()}
                />
              )}
            </div>
          )}
          {options.aboveGrid ? (
            <div className="nb-datagrid__above-grid">{options.aboveGrid}</div>
          ) : null}
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
                      const selected = selectedKeys.includes(key);
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
                                readOnly
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
              className="nb-datagrid__table"
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
                <tr>
                  {options.detailFields && <th className="nb-datagrid__detail-cell" />}
                  {hasCheckbox && <th className="nb-datagrid__select-cell" />}
                  {visibleFields.map((field) => {
                    const sortRule = sort.find((rule) => rule.selector === field.name);
                    const width = getColumnWidth(field, resolvedColWidths);
                    const hasActiveFilter = Boolean((filterInputs[field.name] ?? '').trim());
                    const headerClassName = [
                      sortRule ? 'nb-datagrid__header-cell--sorted' : '',
                      hasActiveFilter ? 'nb-datagrid__header-cell--filtered' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <th
                        key={field.name}
                        className={headerClassName || undefined}
                        title={field.label}
                        style={{ width, textAlign: field.align }}
                        aria-sort={
                          sortRule ? (sortRule.desc ? 'descending' : 'ascending') : undefined
                        }
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
                              <i
                                className="ph ph-caret-up-down nb-datagrid__sort-hint"
                                aria-hidden="true"
                              />
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
                  })}
                  {hasRowActions && <th className="nb-datagrid__actions-cell" />}
                </tr>
                {(options.filterRow ?? true) && (
                  <tr className="nb-datagrid__filter-row">
                    {options.detailFields && <td className="nb-datagrid__detail-cell" />}
                    {hasCheckbox && <td className="nb-datagrid__select-cell" />}
                    {visibleFields.map((field) => {
                      const filterCellWidth = getColumnWidth(field, resolvedColWidths);
                      return (
                        <td
                          key={field.name}
                          style={{ width: filterCellWidth }}
                          className={
                            [
                              field.filterable === false
                                ? 'nb-datagrid__filter-cell--noop'
                                : '',
                              (filterInputs[field.name] ?? '').trim()
                                ? 'nb-datagrid__filter-cell--active'
                                : '',
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
                    const selected = selectedKeys.includes(key);
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
                          className={`nb-datagrid__row ${expanded ? 'nb-datagrid__row--expanded' : ''} ${selected ? 'nb-datagrid__row--selected' : ''}`}
                          tabIndex={0}
                          aria-selected={selected}
                          onClick={() => selectRow(row)}
                          onDoubleClick={() => {
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
                            if (
                              event.key === 'Enter' &&
                              options.allowEdit &&
                              (options.onEdit || options.events?.EDIT)
                            ) {
                              if (options.onEdit) options.onEdit(row);
                              else emit(options.events!.EDIT!, { row });
                            } else if (
                              event.key === 'Enter' &&
                              options.allowView &&
                              options.onView
                            ) {
                              options.onView(row);
                            } else if (
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
                                readOnly
                                aria-label={t('grid.selectRow')}
                              />
                            </td>
                          )}
                          {visibleFields.map((field, columnIndex) => {
                            const width = getColumnWidth(field, resolvedColWidths);
                            return (
                              <td
                                key={field.name}
                                style={{ width, textAlign: field.align }}
                                title={getCellText(
                                  field,
                                  row,
                                  filterRemoteOptions[field.name],
                                  t('common.yes'),
                                  t('common.no'),
                                )}
                              >
                                {renderCell(
                                  field,
                                  row,
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
