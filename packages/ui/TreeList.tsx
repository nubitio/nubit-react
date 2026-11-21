import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { IconButton } from './Button';
import { Checkbox } from './Checkbox';
import { RowActions } from './RowActions';
import type { ContextMenuItem } from './ContextMenu';
import { useUiStrings } from './UiStrings';
import {
  buildTreeListModel,
  flattenVisibleTree,
  getDescendantIds,
  getParentIds,
  getSelectionStates,
  reconcileSelection,
} from './treeListModel';
import type { TreeListModelOptions, TreeNode, TreeNodeId } from './treeListModel';
import './TreeList.scss';

export interface TreeListColumn<T> {
  id: string;
  header: ReactNode;
  /** Custom cell renderer. */
  render?: (item: T, context: { depth: number; expanded: boolean }) => ReactNode;
  /** Value used by built-in sorting and filtering when `render` is present. */
  value?: (item: T) => unknown;
  /** Custom editor renderer used while the cell is being edited. */
  editor?: (context: { item: T; value: string; onChange: (value: string) => void }) => ReactNode;
  editable?: boolean | ((item: T) => boolean);
  sortable?: boolean;
  filterable?: boolean;
  width?: number | string;
  align?: 'start' | 'center' | 'end';
}

export interface TreeListMoveEvent<T> {
  item: T;
  newParent: T | null;
  index: number;
  position: 'before' | 'inside' | 'after';
}

export interface TreeListProps<T> extends TreeListModelOptions<T> {
  /** Flat `parentId` records, nested records, or a mixture of independent roots. */
  items: readonly T[];
  columns: readonly TreeListColumn<T>[];
  /** Optional predicate for nodes whose children have not been loaded yet. */
  hasChildren?: (item: T) => boolean;
  /** Fetches direct children when a collapsed, unloaded node is expanded. */
  loadChildren?: (item: T, options: { signal: AbortSignal }) => Promise<readonly T[]>;
  /** Required when loading flat children that do not contain their own parent id. */
  withParent?: (child: T, parent: T) => T;
  expandedIds?: ReadonlySet<TreeNodeId>;
  defaultExpandedIds?: ReadonlySet<TreeNodeId>;
  onExpandedIdsChange?: (ids: ReadonlySet<TreeNodeId>) => void;
  selectionMode?: 'none' | 'single' | 'multiple';
  selectedIds?: ReadonlySet<TreeNodeId>;
  defaultSelectedIds?: ReadonlySet<TreeNodeId>;
  onSelectedIdsChange?: (ids: ReadonlySet<TreeNodeId>) => void;
  onSelectedItemsChange?: (items: readonly T[]) => void;
  /** Include all currently loaded descendants when toggling a node checkbox. */
  selectDescendants?: boolean;
  /**
   * Recursive selection (`selectionMode="multiple"`): a node with children reads from them, checked
   * when all are and indeterminate when only some are, and toggling it toggles every descendant.
   * `selectedIds` then holds a parent exactly when all of its children are in.
   */
  recursiveSelection?: boolean;
  /** Select-all checkbox in the header, with multiple selection. Default true. */
  allowSelectAll?: boolean;
  /** Tint selected rows. Default true; turn off when the checkboxes already say it. */
  highlightSelectedRows?: boolean;
  /** Tint the row under the pointer. Default true. */
  hoverStateEnabled?: boolean;
  /** Lines between rows. Default true. */
  showRowLines?: boolean;
  /** The header row with column titles (and the select-all checkbox). Default true. */
  showColumnHeaders?: boolean;
  /** The outer border and rounded corners; turn off inside a card or dialog. Default true. */
  showBorders?: boolean;
  /** Alternating row backgrounds. Default false. */
  rowAlternationEnabled?: boolean;
  /** Open every node that has children at first, and any that arrive later. Default false. */
  autoExpandAll?: boolean;
  /** Names a row for assistive technology (its checkbox and expand button). Defaults to the first column's text. */
  getRowLabel?: (item: T) => string;
  /** Placeholder of the search field. */
  filterPlaceholder?: string;
  /** Height at which the rows scroll under a fixed header. */
  maxHeight?: number | string;
  rowActions?: (item: T) => ContextMenuItem[];
  onRowActivate?: (item: T) => void;
  onMove?: (event: TreeListMoveEvent<T>) => void | Promise<void>;
  /** Inline edit callbacks. Only columns with `editable` and `onEdit` can be changed. */
  onEdit?: (item: T, columnId: string, value: string) => void | Promise<void>;
  editable?: (item: T, columnId: string) => boolean;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  filterable?: boolean;
  loading?: boolean;
  emptyState?: ReactNode;
  error?: ReactNode;
  ariaLabel: string;
  className?: string;
  density?: 'compact' | 'comfortable';
  testId?: string;
}

function itemValue<T>(column: TreeListColumn<T>, item: T): unknown {
  if (column.value) return column.value(item);
  const record = item as Record<string, unknown>;
  return record[column.id];
}

function compareValues(left: unknown, right: unknown): number {
  if (left == null) return right == null ? 0 : -1;
  if (right == null) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function filterTree<T>(
  nodes: readonly TreeNode<T>[],
  query: string,
  columns: readonly TreeListColumn<T>[],
): TreeNode<T>[] {
  if (!query) return [...nodes];
  const normalizedQuery = query.toLocaleLowerCase();
  const result: TreeNode<T>[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, query, columns);
    const matches = columns.some((column) =>
      String(itemValue(column, node.item) ?? '')
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
    if (matches || children.length > 0) result.push({ ...node, children });
  }
  return result;
}

function sortTree<T>(
  nodes: readonly TreeNode<T>[],
  column: TreeListColumn<T> | undefined,
  direction: 'asc' | 'desc' | undefined,
): TreeNode<T>[] {
  const result = nodes.map((node) => ({
    ...node,
    children: sortTree(node.children, column, direction),
  }));
  if (!column || !direction) return result;
  const multiplier = direction === 'asc' ? 1 : -1;
  return result.sort(
    (left, right) =>
      multiplier * compareValues(itemValue(column, left.item), itemValue(column, right.item)),
  );
}

export function TreeList<T>({
  items,
  columns,
  getId,
  getParentId,
  getChildren,
  hasChildren,
  loadChildren,
  withParent,
  expandedIds: controlledExpandedIds,
  defaultExpandedIds = new Set(),
  onExpandedIdsChange,
  selectionMode = 'none',
  selectedIds: controlledSelectedIds,
  defaultSelectedIds = new Set(),
  onSelectedIdsChange,
  onSelectedItemsChange,
  selectDescendants = true,
  recursiveSelection = false,
  allowSelectAll = true,
  highlightSelectedRows = true,
  hoverStateEnabled = true,
  showRowLines = true,
  showColumnHeaders = true,
  showBorders = true,
  rowAlternationEnabled = false,
  autoExpandAll = false,
  getRowLabel,
  filterPlaceholder,
  maxHeight,
  rowActions,
  onRowActivate,
  onMove,
  onEdit,
  editable,
  filter: controlledFilter,
  onFilterChange,
  filterable = true,
  loading = false,
  emptyState,
  error,
  ariaLabel,
  className,
  density = 'comfortable',
  testId,
}: TreeListProps<T>): React.JSX.Element {
  const strings = useUiStrings();
  const [localItems, setLocalItems] = useState<readonly T[]>(items);
  // Parents already opened by `autoExpandAll`, so one the user folds stays folded.
  const autoExpanded = useRef<Set<TreeNodeId> | null>(null);
  const [localExpandedIds, setLocalExpandedIds] = useState<ReadonlySet<TreeNodeId>>(() => {
    if (!autoExpandAll) return defaultExpandedIds;
    const initial = getParentIds(buildTreeListModel(items, { getId, getParentId, getChildren }));
    autoExpanded.current = new Set(initial);
    return new Set([...defaultExpandedIds, ...initial]);
  });
  const [localSelectedIds, setLocalSelectedIds] = useState(defaultSelectedIds);
  const [localFilter, setLocalFilter] = useState('');
  const [sort, setSort] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: TreeNodeId; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [moveError, setMoveError] = useState(false);
  const [loadingIds, setLoadingIds] = useState<ReadonlySet<TreeNodeId>>(() => new Set());
  const [loadErrors, setLoadErrors] = useState<ReadonlyMap<TreeNodeId, unknown>>(() => new Map());
  const [editErrors, setEditErrors] = useState<ReadonlyMap<string, unknown>>(() => new Map());
  const controllers = useRef(new Map<TreeNodeId, AbortController>());
  const rows = useRef(new Map<TreeNodeId, HTMLTableRowElement>());
  const filter = controlledFilter ?? localFilter;
  const expandedIds = controlledExpandedIds ?? localExpandedIds;
  const selectedIds = controlledSelectedIds ?? localSelectedIds;

  React.useEffect(() => setLocalItems(items), [items]);
  React.useEffect(
    () => () => {
      controllers.current.forEach((controller) => controller.abort());
      controllers.current.clear();
    },
    [],
  );

  const modelOptions = useMemo(
    () => ({ getId, getParentId, getChildren }),
    [getChildren, getId, getParentId],
  );
  const tree = useMemo(
    () => buildTreeListModel(localItems, modelOptions),
    [localItems, modelOptions],
  );
  const filteredTree = useMemo(
    () => filterTree(tree, filter.trim(), columns),
    [columns, filter, tree],
  );
  const sortColumn = sort ? columns.find((column) => column.id === sort.columnId) : undefined;
  const sortedTree = useMemo(
    () => sortTree(filteredTree, sortColumn, sort?.direction),
    [filteredTree, sort?.direction, sortColumn],
  );
  const filterExpandedIds = useMemo(() => {
    const ids = new Set<TreeNodeId>();
    const visit = (node: TreeNode<T>): void => {
      if (node.children.length > 0) ids.add(node.id);
      node.children.forEach(visit);
    };
    sortedTree.forEach(visit);
    return ids;
  }, [sortedTree]);
  const visibleNodes = useMemo(
    () => flattenVisibleTree(sortedTree, filter.trim() ? filterExpandedIds : expandedIds),
    [expandedIds, filter, filterExpandedIds, sortedTree],
  );
  const effectiveExpandedIds = filter.trim() ? filterExpandedIds : expandedIds;
  React.useEffect(() => {
    if (!autoExpandAll || controlledExpandedIds !== undefined) return;
    const seen = (autoExpanded.current ??= new Set());
    const fresh = [...getParentIds(tree)].filter((id) => !seen.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => seen.add(id));
    setLocalExpandedIds((current) => new Set([...current, ...fresh]));
  }, [autoExpandAll, controlledExpandedIds, tree]);
  const recursive = recursiveSelection && selectionMode === 'multiple';
  const selectionStates = useMemo(
    () => getSelectionStates(tree, selectedIds, recursive),
    [recursive, selectedIds, tree],
  );
  const nodeById = useMemo(() => {
    const result = new Map<TreeNodeId, TreeNode<T>>();
    const visit = (node: TreeNode<T>): void => {
      result.set(node.id, node);
      node.children.forEach(visit);
    };
    tree.forEach(visit);
    return result;
  }, [tree]);

  const updateExpanded = useCallback(
    (next: Set<TreeNodeId>) => {
      if (controlledExpandedIds === undefined) setLocalExpandedIds(next);
      onExpandedIdsChange?.(next);
    },
    [controlledExpandedIds, onExpandedIdsChange],
  );
  const updateSelected = useCallback(
    (next: Set<TreeNodeId>) => {
      if (controlledSelectedIds === undefined) setLocalSelectedIds(next);
      onSelectedIdsChange?.(next);
      if (onSelectedItemsChange) {
        onSelectedItemsChange(
          [...next].flatMap((id) => {
            const node = nodeById.get(id);
            return node ? [node.item] : [];
          }),
        );
      }
    },
    [controlledSelectedIds, nodeById, onSelectedIdsChange, onSelectedItemsChange],
  );
  const updateFilter = (value: string): void => {
    if (controlledFilter === undefined) setLocalFilter(value);
    onFilterChange?.(value);
  };

  const expand = useCallback(
    async (node: TreeNode<T>): Promise<void> => {
      const next = new Set(expandedIds);
      if (next.has(node.id) && !loadErrors.has(node.id)) {
        controllers.current.get(node.id)?.abort();
        next.delete(node.id);
        updateExpanded(next);
        return;
      }
      next.add(node.id);
      updateExpanded(next);
      if (
        !loadChildren ||
        (hasChildren ? !hasChildren(node.item) : false) ||
        node.children.length > 0
      )
        return;

      const controller = new AbortController();
      controllers.current.get(node.id)?.abort();
      controllers.current.set(node.id, controller);
      setLoadingIds((current) => new Set(current).add(node.id));
      setLoadErrors((current) => {
        const nextErrors = new Map(current);
        nextErrors.delete(node.id);
        return nextErrors;
      });
      try {
        const children = await loadChildren(node.item, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const normalized = withParent
          ? children.map((child) => withParent(child, node.item))
          : children;
        setLocalItems((current) => [...current, ...normalized]);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setLoadErrors((current) => new Map(current).set(node.id, cause));
        }
      } finally {
        if (controllers.current.get(node.id) === controller) controllers.current.delete(node.id);
        setLoadingIds((current) => {
          const nextLoading = new Set(current);
          nextLoading.delete(node.id);
          return nextLoading;
        });
      }
    },
    [expandedIds, hasChildren, loadChildren, loadErrors, updateExpanded, withParent],
  );

  const toggleSelected = (node: TreeNode<T>): void => {
    if (recursive) {
      // An indeterminate parent selects everything below it, like a checked one clears it.
      const select = selectionStates.get(node.id) !== 'checked';
      const ids = new Set(selectedIds);
      for (const id of [node.id, ...getDescendantIds(node)]) {
        if (select) ids.add(id);
        else ids.delete(id);
      }
      updateSelected(reconcileSelection(tree, ids));
      return;
    }
    const next = new Set(selectionMode === 'single' ? [] : selectedIds);
    if (selectedIds.has(node.id)) next.delete(node.id);
    else next.add(node.id);
    if (selectionMode === 'multiple' && selectDescendants) {
      for (const id of getDescendantIds(node)) {
        if (selectedIds.has(node.id)) next.delete(id);
        else next.add(id);
      }
    }
    updateSelected(next);
  };

  const parentOf = (targetId: TreeNodeId): TreeNode<T> | null => {
    const find = (nodes: readonly TreeNode<T>[]): TreeNode<T> | null => {
      for (const node of nodes) {
        if (node.children.some((child) => child.id === targetId)) return node;
        const found = find(node.children);
        if (found) return found;
      }
      return null;
    };
    return find(tree);
  };
  const siblingsOf = (parent: TreeNode<T> | null): TreeNode<T>[] =>
    parent ? parent.children : tree;

  const moveRow = (
    item: T,
    target: TreeNode<T> | null,
    position: 'before' | 'inside' | 'after' = 'inside',
  ): void => {
    if (!onMove) return;
    const sourceId = getId(item);
    const sourceNode = nodeById.get(sourceId);
    if (!sourceNode) return;
    if (target?.id === sourceId) return;

    const parent = position === 'inside' ? target : target ? parentOf(target.id) : null;
    if (parent && (parent.id === sourceId || getDescendantIds(sourceNode).includes(parent.id)))
      return;

    const siblings = siblingsOf(parent).filter((node) => node.id !== sourceId);
    const targetIndex = target ? siblings.findIndex((node) => node.id === target.id) : -1;
    const index = targetIndex < 0 ? siblings.length : targetIndex + (position === 'after' ? 1 : 0);
    void Promise.resolve(
      onMove({
        item,
        newParent: parent?.item ?? null,
        index,
        position,
      }),
    )
      .then(() => setMoveError(false))
      .catch(() => setMoveError(true));
  };

  const saveEdit = async (node: TreeNode<T>, columnId: string): Promise<void> => {
    const key = `${String(node.id)}:${columnId}`;
    setEditingCell(null);
    try {
      await onEdit?.(node.item, columnId, editValue);
      setEditErrors((current) => {
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    } catch (cause) {
      setEditErrors((current) => new Map(current).set(key, cause));
      setEditingCell({ id: node.id, columnId });
    }
  };

  const onRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, index: number): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const target = visibleNodes[index + (event.key === 'ArrowDown' ? 1 : -1)];
      if (target) rows.current.get(target.id)?.focus();
    }
    if (event.key === 'ArrowRight' && visibleNodes[index]) {
      event.preventDefault();
      const node = visibleNodes[index];
      if ((node.children.length > 0 || hasChildren?.(node.item)) && !expandedIds.has(node.id)) {
        void expand(node);
      } else if (expandedIds.has(node.id) && node.children[0]) {
        rows.current.get(node.children[0].id)?.focus();
      }
    }
    if (event.key === 'ArrowLeft' && visibleNodes[index]) {
      event.preventDefault();
      const node = visibleNodes[index];
      if (expandedIds.has(node.id)) void expand(node);
      else {
        const parentId = getParentId?.(node.item);
        if (parentId != null) rows.current.get(parentId)?.focus();
      }
    }
    if (event.key === 'Enter' && visibleNodes[index]) onRowActivate?.(visibleNodes[index].item);
  };

  const classNames = [
    'nb-tree-list',
    `nb-tree-list--${density}`,
    !showBorders && 'nb-tree-list--borderless',
    !showRowLines && 'nb-tree-list--no-row-lines',
    !hoverStateEnabled && 'nb-tree-list--no-hover',
    !highlightSelectedRows && 'nb-tree-list--no-selection-tint',
    rowAlternationEnabled && 'nb-tree-list--striped',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const hasSelection = selectionMode !== 'none';
  const stateOf = (id: TreeNodeId) => selectionStates.get(id) ?? 'unchecked';
  const allVisibleSelected =
    visibleNodes.length > 0 && visibleNodes.every((node) => stateOf(node.id) === 'checked');
  const someVisibleSelected =
    !allVisibleSelected && visibleNodes.some((node) => stateOf(node.id) !== 'unchecked');
  const rowLabel = (item: T): string => {
    const custom = getRowLabel?.(item);
    if (custom) return custom;
    const first = columns[0] ? String(itemValue(columns[0], item) ?? '').trim() : '';
    return first || String(getId(item));
  };

  return (
    <div className={classNames} data-testid={testId}>
      {filterable && (
        <div className="nb-tree-list__toolbar">
          <label className="nb-tree-list__filter">
            <span className="nb-tree-list__sr-only">{strings.treeListFilter}</span>
            <input
              type="search"
              value={filter}
              placeholder={filterPlaceholder ?? strings.treeListFilter}
              onChange={(event) => updateFilter(event.currentTarget.value)}
            />
          </label>
          {filter && (
            <button
              type="button"
              className="nb-tree-list__clear-filter"
              onClick={() => updateFilter('')}
            >
              {strings.clear}
            </button>
          )}
        </div>
      )}
      {error && (
        <div className="nb-tree-list__error" role="alert">
          {error}
        </div>
      )}
      {moveError && (
        <div className="nb-tree-list__error" role="alert">
          {strings.treeListMoveFailed}
        </div>
      )}
      {loading && (
        <div className="nb-tree-list__loading" role="status">
          {strings.searching}
        </div>
      )}
      {!loading && visibleNodes.length === 0 ? (
        <div className="nb-tree-list__empty">{emptyState ?? strings.treeListEmpty}</div>
      ) : (
        <div
          className="nb-tree-list__scroll"
          style={maxHeight === undefined ? undefined : { maxHeight }}
        >
          <table
            className="nb-tree-list__table"
            role="treegrid"
            aria-label={ariaLabel}
            aria-busy={loading || loadingIds.size > 0}
          >
            {showColumnHeaders && (
              <thead>
                <tr>
                  {hasSelection && (
                    <th className="nb-tree-list__selection-cell">
                      {selectionMode === 'multiple' && allowSelectAll && (
                        <Checkbox
                          aria-label={strings.treeListSelectAll}
                          checked={allVisibleSelected}
                          indeterminate={someVisibleSelected}
                          onChange={() => {
                            const next = new Set(selectedIds);
                            for (const node of visibleNodes) {
                              if (allVisibleSelected) next.delete(node.id);
                              else next.add(node.id);
                            }
                            updateSelected(recursive ? reconcileSelection(tree, next) : next);
                          }}
                        />
                      )}
                    </th>
                  )}
                  {columns.map((column, index) => (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={
                        sort?.columnId === column.id
                          ? sort.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      style={column.width ? { width: column.width } : undefined}
                      className={`nb-tree-list__align--${column.align ?? 'start'}`}
                    >
                      {column.sortable === false || index === 0 ? (
                        column.header
                      ) : (
                        <button
                          type="button"
                          className="nb-tree-list__sort"
                          onClick={() =>
                            setSort((current) =>
                              current?.columnId === column.id
                                ? current.direction === 'asc'
                                  ? { columnId: column.id, direction: 'desc' }
                                  : null
                                : { columnId: column.id, direction: 'asc' },
                            )
                          }
                        >
                          {column.header}
                          <span aria-hidden="true">
                            {sort?.columnId === column.id
                              ? sort.direction === 'asc'
                                ? '↑'
                                : '↓'
                              : '↕'}
                          </span>
                        </button>
                      )}
                    </th>
                  ))}
                  {rowActions && <th scope="col" aria-label={strings.rowActions} />}
                </tr>
              </thead>
            )}
            <tbody
              onDragOver={(event) => {
                if (onMove && event.target === event.currentTarget) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={(event) => {
                if (!onMove || event.target !== event.currentTarget) return;
                event.preventDefault();
                const draggedId = event.dataTransfer.getData('text/plain');
                const dragged = nodeById.get(draggedId) ?? nodeById.get(Number(draggedId));
                if (dragged) moveRow(dragged.item, null, 'after');
              }}
            >
              {visibleNodes.map((node, index) => {
                const expanded = effectiveExpandedIds.has(node.id);
                const canExpand =
                  node.children.length > 0 ||
                  (hasChildren ? hasChildren(node.item) : !!loadChildren);
                const selectionState = stateOf(node.id);
                const selected = selectionState === 'checked';
                const parent = getParentId?.(node.item);
                return (
                  <tr
                    key={node.id}
                    ref={(element) => {
                      if (element) rows.current.set(node.id, element);
                      else rows.current.delete(node.id);
                    }}
                    role="row"
                    aria-level={node.depth + 1}
                    aria-expanded={canExpand ? expanded : undefined}
                    aria-selected={hasSelection ? selected : undefined}
                    tabIndex={index === 0 ? 0 : -1}
                    draggable={!!onMove}
                    onKeyDown={(event) => onRowKeyDown(event, index)}
                    onClick={() => onRowActivate?.(node.item)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', String(node.id));
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(event) => {
                      if (onMove) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const draggedId = event.dataTransfer.getData('text/plain');
                      const dragged = nodeById.get(draggedId) ?? nodeById.get(Number(draggedId));
                      const bounds = event.currentTarget.getBoundingClientRect();
                      const relativeY = event.clientY - bounds.top;
                      const position =
                        relativeY < bounds.height * 0.25
                          ? 'before'
                          : relativeY > bounds.height * 0.75
                            ? 'after'
                            : 'inside';
                      if (dragged) moveRow(dragged.item, node, position);
                    }}
                    onDragEnd={() => {}}
                    data-parent-id={parent == null ? undefined : String(parent)}
                  >
                    {hasSelection && (
                      <td className="nb-tree-list__selection-cell">
                        <Checkbox
                          aria-label={`${strings.treeListSelect} ${rowLabel(node.item)}`}
                          checked={selected}
                          indeterminate={selectionState === 'indeterminate'}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleSelected(node)}
                        />
                      </td>
                    )}
                    {columns.map((column, columnIndex) => {
                      const isEditing =
                        editingCell?.id === node.id && editingCell.columnId === column.id;
                      const rawValue = itemValue(column, node.item);
                      return (
                        <td
                          key={column.id}
                          className={`nb-tree-list__align--${column.align ?? 'start'}`}
                          onDoubleClick={() => {
                            const columnCanEdit =
                              column.editable === true ||
                              (typeof column.editable === 'function' &&
                                column.editable(node.item)) ||
                              editable?.(node.item, column.id) === true;
                            if (!onEdit || !columnCanEdit) return;
                            setEditingCell({ id: node.id, columnId: column.id });
                            setEditValue(String(rawValue ?? ''));
                          }}
                        >
                          {columnIndex === 0 && (
                            <span
                              className="nb-tree-list__indent"
                              style={{ '--nb-tree-depth': node.depth } as React.CSSProperties}
                            >
                              {canExpand ? (
                                <IconButton
                                  icon={
                                    loadingIds.has(node.id)
                                      ? 'ph ph-spinner'
                                      : expanded
                                        ? 'ph ph-caret-down'
                                        : 'ph ph-caret-right'
                                  }
                                  label={`${expanded ? strings.treeListCollapse : strings.treeListExpand} ${rowLabel(node.item)}`}
                                  disabled={loadingIds.has(node.id)}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void expand(node);
                                  }}
                                />
                              ) : (
                                <span className="nb-tree-list__spacer" />
                              )}
                            </span>
                          )}
                          {isEditing ? (
                            column.editor ? (
                              column.editor({
                                item: node.item,
                                value: editValue,
                                onChange: setEditValue,
                              })
                            ) : (
                              <input
                                autoFocus
                                value={editValue}
                                aria-label={`${strings.treeListEdit} ${column.id}`}
                                onChange={(event) => setEditValue(event.currentTarget.value)}
                                onBlur={() => void saveEdit(node, column.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') void saveEdit(node, column.id);
                                  if (event.key === 'Escape') setEditingCell(null);
                                }}
                              />
                            )
                          ) : column.render ? (
                            column.render(node.item, { depth: node.depth, expanded })
                          ) : (
                            String(rawValue ?? '')
                          )}
                          {loadErrors.has(node.id) && columnIndex === 0 && (
                            <button
                              type="button"
                              className="nb-tree-list__retry"
                              onClick={() => void expand(node)}
                            >
                              {strings.retrySearch}
                            </button>
                          )}
                          {editErrors.has(`${String(node.id)}:${column.id}`) && isEditing && (
                            <span className="nb-tree-list__edit-error" role="alert">
                              {strings.searchFailed}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {rowActions && (
                      <td
                        className="nb-tree-list__actions-cell"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <RowActions
                          items={rowActions(node.item)}
                          triggerLabel={strings.rowActions}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
