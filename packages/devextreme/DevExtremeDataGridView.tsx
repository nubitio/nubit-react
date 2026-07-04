import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import CustomStore from 'devextreme/data/custom_store';
import DataGrid, {
  Column,
  Editing,
  FilterRow,
  HeaderFilter,
  Item,
  LoadPanel,
  MasterDetail,
  Pager,
  Paging,
  RemoteOperations,
  Selection,
  Sorting,
  Toolbar,
} from 'devextreme-react/data-grid';

import type { DataRecord } from '@nubitio/core';
import { useCoreHttpClient, useCoreTranslation } from '@nubitio/core';
import type { DataGridViewOptions, GridHandle } from '@nubitio/crud';
import {
  canEditFieldInline,
  FieldType,
  getIdField,
  HydraAdapter,
  resolveInlineEditToolbar,
  serializeFormFields,
  useResourceStoreFactory,
} from '@nubitio/crud';
import type { FilterRule, ResourceLoadOptions } from '@nubitio/crud';
import { ConfirmDialog } from '@nubitio/ui';

import { mergeGridFilters } from './convertDxFilterToNubit';
import { DevExtremeDetailGridSection } from './DevExtremeDetailGridSection';
import { mapFieldsToDxColumns } from './mapFieldsToDxColumns';

type DxEditMode = 'row' | 'cell' | 'batch' | 'popup';

function resolveDxEditMode(editMode: DataGridViewOptions['editMode']): DxEditMode | null {
  if (!editMode || editMode === 'popup') return null;
  return editMode;
}

const DX_PAGE_SIZE_OPTIONS = [10, 20, 50];

function resolveDxRemoteOperations(options: DataGridViewOptions) {
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

function isHeaderFilterLookup(loadOptions: Record<string, unknown>): boolean {
  return Array.isArray(loadOptions.group) || loadOptions.requireGroupCount === true;
}

export const DevExtremeDataGridView = forwardRef<GridHandle, DataGridViewOptions>(
  (options, ref) => {
    const { t } = useCoreTranslation();
    const httpClient = useCoreHttpClient();
    const resourceStoreFactory = useResourceStoreFactory();
    const gridRef = useRef<{
      instance?: () => {
        refresh?: () => void;
        getSelectedRowKeys?: () => unknown[];
        getSelectedRowsData?: () => DataRecord[];
        filter?: (value: unknown) => void;
        cancelEditData?: () => void;
        saveEditData?: () => Promise<void>;
        hasEditData?: () => boolean;
        beginCustomLoading?: (message?: string) => void;
        endCustomLoading?: () => void;
      };
    } | null>(null);

    const [activeFilter, setActiveFilter] = useState<unknown>(null);
    const [confirmRow, setConfirmRow] = useState<DataRecord | null>(null);
    const selectedRowsRef = useRef<DataRecord[]>([]);
    const selectedKeysRef = useRef<unknown[]>([]);
    const hasPendingEditsRef = useRef(false);

    const idField = useMemo(() => getIdField(options.fields), [options.fields]);
    const adapter = options.adapter ?? HydraAdapter;
    const dxEditMode = resolveDxEditMode(options.editMode);
    const inlineEditing = dxEditMode != null && (options.allowEdit ?? true);
    const inlineToolbar = useMemo(
      () =>
        inlineEditing && dxEditMode !== 'row'
          ? resolveInlineEditToolbar(dxEditMode, options.inlineEditToolbar)
          : null,
      [dxEditMode, inlineEditing, options.inlineEditToolbar],
    );

    const columns = useMemo(
      () =>
        mapFieldsToDxColumns(options.fields, options.visibleColumns).map((column) => ({
          ...column,
          allowEditing:
            inlineEditing &&
            options.fields.some(
              (field) => field.name === column.dataField && canEditFieldInline(field),
            ),
        })),
      [inlineEditing, options.fields, options.visibleColumns],
    );

    const url = options.url;
    const httpClientRef = useRef(httpClient);
    httpClientRef.current = httpClient;

    const source = useMemo(
      () =>
        resourceStoreFactory({
          url,
          idField,
          byKeyUrl: null,
        }),
      [idField, resourceStoreFactory, url],
    );

    const optionsRef = useRef(options);
    optionsRef.current = options;
    const fieldsRef = useRef(options.fields);
    fieldsRef.current = options.fields;
    const routingFilterRef = useRef(options.filter);
    routingFilterRef.current = options.filter;
    const activeFilterRef = useRef(activeFilter);
    activeFilterRef.current = activeFilter;

    const dataSource = useMemo(() => {
      if (optionsRef.current.data) {
        return optionsRef.current.data;
      }

      return new CustomStore({
        key: idField,
        load: async (loadOptions) => {
          const current = optionsRef.current;
          if (current.manualLoad) {
            return { data: [], totalCount: 0 };
          }

          const request: ResourceLoadOptions = {
            skip: loadOptions.skip,
            take: loadOptions.take,
          };

          if (Array.isArray(loadOptions.sort) && loadOptions.sort.length > 0) {
            request.sort = loadOptions.sort.map((rule) => {
              const typedRule = rule as { selector?: string; desc?: boolean };
              return {
                selector: typedRule.selector,
                desc: !!typedRule.desc,
              };
            });
          } else if (current.sort?.length) {
            request.sort = current.sort;
          }

          const mergedFilter = mergeGridFilters(
            routingFilterRef.current,
            loadOptions.filter ?? activeFilterRef.current,
            fieldsRef.current,
          );
          if (mergedFilter.length > 0) {
            request.filter = mergedFilter;
          }

          if (loadOptions.searchValue && loadOptions.searchExpr) {
            request.searchExpr = loadOptions.searchExpr;
            request.searchValue = loadOptions.searchValue;
          }

          // Header-filter distinct-value lookups pass `group` — serve the full
          // collection so DevExtreme can derive values without a stuck LoadPanel.
          if (isHeaderFilterLookup(loadOptions as Record<string, unknown>)) {
            request.skip = 0;
            request.take = 1000;
          }

          const result = await source.load(request);
          current.onContentReady?.();
          return {
            data: result.data,
            totalCount: result.totalCount,
          };
        },
        update: async (key, values) => {
          const current = optionsRef.current;
          const currentAdapter = current.adapter ?? adapter;
          const payload = serializeFormFields(
            values as DataRecord,
            current.fields.filter((field) => canEditFieldInline(field)),
            { uploadedFiles: [], getFieldValue: (name) => values[name], adapter: currentAdapter },
          );
          await httpClientRef.current.patch(
            currentAdapter.buildItemUrl(current.url, key as string | number),
            payload,
          );
          current.onContentReady?.();
        },
      });
    }, [adapter, idField, source]);

    const refresh = useCallback(() => {
      gridRef.current?.instance?.()?.refresh?.();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        showLoading: () => gridRef.current?.instance?.()?.beginCustomLoading?.(t('grid.loading')),
        hideLoading: () => gridRef.current?.instance?.()?.endCustomLoading?.(),
        refresh,
        reset: () => {
          setActiveFilter(null);
          gridRef.current?.instance?.()?.filter?.(null);
          refresh();
        },
        loadData: async () => {
          const result = await source.load({});
          return result.data;
        },
        getSelectedRowKey: () => {
          const key = selectedKeysRef.current[0];
          return typeof key === 'string' || typeof key === 'number' ? key : undefined;
        },
        getSelectedRow: () => selectedRowsRef.current[0],
        getSelectedRowKeys: () => selectedKeysRef.current,
        getSelectedRows: () => selectedRowsRef.current,
        getFilter: () => mergeGridFilters(routingFilterRef.current, activeFilter, fieldsRef.current),
        filter: (filterRule: FilterRule | null) => {
          const nextFilter = filterRule
            ? [filterRule.field, filterRule.operator, filterRule.value]
            : null;
          setActiveFilter(nextFilter);
          gridRef.current?.instance?.()?.filter?.(nextFilter);
          refresh();
        },
        hasEditData: () =>
          hasPendingEditsRef.current || !!gridRef.current?.instance?.()?.hasEditData?.(),
        saveChanges: async () => {
          if (options.onBatchSave) {
            const instance = gridRef.current?.instance?.();
            const selected = instance?.getSelectedRowsData?.() ?? selectedRowsRef.current;
            await options.onBatchSave(selected);
            instance?.cancelEditData?.();
            hasPendingEditsRef.current = false;
            refresh();
            return true;
          }
          await gridRef.current?.instance?.()?.saveEditData?.();
          hasPendingEditsRef.current = false;
          refresh();
          return true;
        },
      }),
      [options.onBatchSave, refresh, source],
    );

    const handleSelectionChanged = useCallback(
      (event: { selectedRowsData?: Array<Record<string, unknown>>; selectedRowKeys?: unknown[] }) => {
        const rows = (event.selectedRowsData ?? []) as DataRecord[];
        selectedRowsRef.current = rows;
        selectedKeysRef.current = event.selectedRowKeys ?? rows.map((row) => row[idField]);
        options.onSelectionChanged?.({ selectedRowsData: rows });
      },
      [idField, options],
    );

    const handleRowDblClick = useCallback(
      (event: { data?: DataRecord }) => {
        if (inlineEditing) return;
        if (!event.data) return;
        if (options.allowView) {
          options.onView?.(event.data);
          return;
        }
        if (options.allowEdit && options.canEditRow?.(event.data) !== false) {
          options.onEdit?.(event.data);
        }
      },
      [inlineEditing, options],
    );

    const handleToolbarPreparing = useCallback(
      (event: { toolbarOptions?: { items?: Array<Record<string, unknown>> } }) => {
        const items = event.toolbarOptions?.items ?? [];

        if (options.allowAdd) {
          items.unshift({
            location: 'after',
            widget: 'dxButton',
            options: {
              text: t('grid.buttonNew'),
              icon: 'plus',
              disabled: options.addDisabled,
              onClick: () => options.onAdd?.(),
            },
          });
        }

        if (inlineToolbar?.save) {
          items.push({
            location: 'after',
            widget: 'dxButton',
            options: {
              text: t('grid.inlineSaveChanges'),
              icon: 'save',
              onClick: () => void gridRef.current?.instance?.()?.saveEditData?.(),
            },
          });
        }
        if (inlineToolbar?.revert) {
          items.push({
            location: 'after',
            widget: 'dxButton',
            options: {
              text: t('grid.inlineRevertChanges'),
              icon: 'revert',
              onClick: () => gridRef.current?.instance?.()?.cancelEditData?.(),
            },
          });
        }

        if (event.toolbarOptions) {
          event.toolbarOptions.items = items;
        }
      },
      [inlineToolbar, options, t],
    );

    const handleSaving = useCallback(
      async (event: {
        cancel?: boolean;
        changes?: Array<{ type?: string; data?: DataRecord; key?: unknown }>;
      }) => {
        if (!options.onBatchSave) return;
        event.cancel = true;
        const changedRows =
          event.changes
            ?.filter((change) => change.type === 'update' && change.data)
            .map((change) => change.data!) ?? [];
        if (changedRows.length > 0) {
          await options.onBatchSave(changedRows);
        }
        hasPendingEditsRef.current = false;
        refresh();
      },
      [options.onBatchSave, refresh],
    );

    const handleEditCanceled = useCallback(() => {
      hasPendingEditsRef.current = false;
    }, []);

    const handleEditingChange = useCallback(() => {
      hasPendingEditsRef.current = true;
    }, []);

    const confirmDelete = useCallback(() => {
      if (confirmRow) {
        options.onDelete?.(confirmRow);
      }
      setConfirmRow(null);
    }, [confirmRow, options]);

    const requestDelete = useCallback(
      (rowData?: DataRecord) => {
        if (!rowData || options.canDeleteRow?.(rowData) === false) return;
        setConfirmRow(rowData);
      },
      [options.canDeleteRow],
    );

    const renderRowActions = useCallback(
      (cell: { data?: DataRecord }) => {
        const row = cell.data;
        if (!row) return null;

        return (
          <div className="nb-dx-row-actions">
            {options.allowEdit && options.canEditRow?.(row) !== false ? (
              <button
                type="button"
                className="nb-dx-row-actions__btn"
                aria-label={t('grid.buttonEdit')}
                onClick={() => options.onEdit?.(row)}
              >
                <i className="dx-icon dx-icon-edit" aria-hidden />
              </button>
            ) : null}
            {options.allowDelete && options.canDeleteRow?.(row) !== false ? (
              <button
                type="button"
                className="nb-dx-row-actions__btn nb-dx-row-actions__btn--delete"
                aria-label={t('grid.buttonDelete')}
                onClick={() => requestDelete(row)}
              >
                <i className="dx-icon dx-icon-trash" aria-hidden />
              </button>
            ) : null}
          </div>
        );
      },
      [
        options.allowDelete,
        options.allowEdit,
        options.canDeleteRow,
        options.canEditRow,
        options.onEdit,
        requestDelete,
        t,
      ],
    );

    const remoteOperations = resolveDxRemoteOperations(options);
    const hasMasterDetail = Boolean(options.detailFields && options.detailUrl);

    const renderMasterDetail = useCallback(
      (detailInfo: { data?: DataRecord }) => {
        const row = detailInfo.data;
        if (!row) return null;

        const detailFields =
          typeof options.detailFields === 'function'
            ? options.detailFields(row)
            : options.detailFields;
        const rowKey = row[idField];
        const detailUrl = options.detailUrl?.replace('{id}', String(rowKey));

        if (!detailFields?.length || !detailUrl) return null;

        return <DevExtremeDetailGridSection fields={detailFields} url={detailUrl} />;
      },
      [idField, options.detailFields, options.detailUrl],
    );

    const showToolbar = options.toolbarVisible !== false;
    const showFilterRow = options.filterRow ?? true;
    const showPaging = options.paging ?? true;
    const pageSize = options.pageSize ?? 20;

    return (
      <div className="view datagrid-list data-grid-view">
        <div className="view-wrapper view-wrapper-datagrid-list list-page">
          <div className="nb-dx-datagrid">
            {options.aboveGrid ? (
              <div className="nb-dx-datagrid__above-grid">{options.aboveGrid}</div>
            ) : null}
            {showToolbar && options.title ? (
              <div className="nb-dx-datagrid__toolbar">
                <div className="grid-header">{options.title}</div>
              </div>
            ) : null}
            {options.beforeToolbar?.()}
            <div className="nb-dx-datagrid__grid">
              <DataGrid
                ref={gridRef}
                dataSource={dataSource}
                keyExpr={idField}
                height="100%"
                showBorders
                remoteOperations={remoteOperations}
                onSelectionChanged={handleSelectionChanged}
                onRowDblClick={handleRowDblClick}
                onToolbarPreparing={showToolbar ? handleToolbarPreparing : undefined}
                onSaving={options.onBatchSave ? handleSaving : undefined}
                onEditCanceled={handleEditCanceled}
                onEditingChange={handleEditingChange}
              >
          {typeof remoteOperations === 'object' ? <RemoteOperations {...remoteOperations} /> : null}
          <LoadPanel enabled showPane shading={false} />
          {options.selectionMode === 'multiple' ? (
            <Selection mode="multiple" showCheckBoxesMode="always" />
          ) : (
            <Selection mode="single" />
          )}
          {showPaging ? (
            <>
              <Paging enabled pageSize={pageSize} />
              <Pager
                visible
                showInfo
                showPageSizeSelector
                allowedPageSizes={DX_PAGE_SIZE_OPTIONS}
                displayMode="full"
              />
            </>
          ) : (
            <Paging enabled={false} />
          )}
          <Sorting mode="single" />
          {showFilterRow ? <FilterRow visible applyFilter="auto" /> : null}
          {options.headerFilter ? <HeaderFilter visible /> : null}
          {showToolbar ? <Toolbar visible /> : null}
          {hasMasterDetail ? <MasterDetail enabled render={renderMasterDetail} /> : null}
          {inlineEditing && dxEditMode ? (
            <Editing
              mode={dxEditMode}
              allowUpdating={
                options.allowEdit !== false &&
                options.fields.some(
                  (field) => field.type !== FieldType.FILE && canEditFieldInline(field),
                )
              }
              useIcons
              selectTextOnEditStart
            />
          ) : null}
          {columns.map((column) => (
            <Column key={column.dataField} {...column} />
          ))}
          {!inlineEditing && (options.allowDelete || options.allowEdit) ? (
            <Column
              caption=""
              width={110}
              allowSorting={false}
              allowFiltering={false}
              allowEditing={false}
              cellRender={renderRowActions}
            />
          ) : null}
          <Item name="searchPanel" />
              </DataGrid>
            </div>
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
          </div>
        </div>
      </div>
    );
  },
);

DevExtremeDataGridView.displayName = 'DevExtremeDataGridView';