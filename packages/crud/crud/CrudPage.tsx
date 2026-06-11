import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DataGridView } from '../datagrid/DataGridView';
import { FormView, FORM_EVENTS } from '../form/FormView';
import { CrudFormShell } from '../view/CrudFormShell';
import { resolveViewMode } from '../view/viewMode';
import { useCrudPage } from './useCrudPage';
import { useCoreTranslation, useEvents } from '@nubitio/core';
import type { ResourceConfig, ResourceRowActions } from './ResourceConfig';
import type { BulkAction } from './BulkAction';
import type { Field } from '../field/Field';
import { AuditTrailPanel } from './AuditTrailPanel';
import { DialogStoreProvider } from './DialogStoreProvider';
import { useCrudDialogStore } from './useCrudDialogStore';
import type { DialogMode } from './dialogStore';
import { Button, ConfirmDialog } from '@nubitio/ui';
import { resolveCrudResource } from './resolveCrudResource';
import type { FormDataRecord } from '../form/FormDataSnapshot';
import type { FormHandle } from '../form/FormHandle';
import type { DataRecord } from '@nubitio/core';
import type { GridHandle } from '../datagrid/GridHandle';
import { resolveResourceDetails } from './resolveResourceDetails';
import { resolveResourceToolbar } from './resolveResourceToolbar';
import type { SmartCrudOperation } from './fieldOperationSemantics';
import { ColumnPresetSelector } from './ColumnPresetSelector';

type GridSelectionChange = {
  selectedRowsData?: unknown[];
};

interface CrudPageProps<T extends DataRecord = DataRecord> {
  resource: ResourceConfig<T>;
  /**
   * Called whenever any form field value changes.
   * Receives a snapshot of the full current form data object.
   * Wire this to SmartCrudPage's formData state for reactive rule evaluation.
   */
  onFormDataChange?: (data: FormDataRecord) => void;
  /**
   * When provided, open the edit dialog for this record on mount.
   * Enables URL deep-linking (e.g. /products/42 → edit record 42).
   * Defaults to null — existing behaviour unchanged when omitted.
   */
  initialRecordId?: string | number | null;
  /**
   * When true, open the add dialog on mount.
   * Enables URL deep-linking (e.g. /products/new → open add dialog).
   * Defaults to false — existing behaviour unchanged when omitted.
   */
  initialIsNew?: boolean;
  computedValues?: FormDataRecord;
  initialFilters?: Record<string, string>;
  onFiltersChange?: (filters: Record<string, string>) => void;
  /**
   * Optional external form ref. When provided, CrudPage uses it instead of
   * creating an internal one — allows the parent to call setFieldValue /
   * getFieldValue on the active dialog form (e.g. for field observers).
   */
  formRef?: React.RefObject<FormHandle | null>;
  /**
   * Called whenever grid row selection changes, after internal selection state
   * is updated. Receives the full selected row objects.
   */
  onSelectionChanged?: (rows: DataRecord[]) => void;
  /** Disables the edit action on every grid row (passed through to DataGridView). */
  editDisabled?: boolean;
  /** Disables the delete action on every grid row (passed through to DataGridView). */
  deleteDisabled?: boolean;
  /** External ref forwarded to the DataGridView — allows the parent to call
   *  showLoading / hideLoading / refresh / getSelectedRow imperatively. */
  gridRef?: React.RefObject<GridHandle | null>;
  onOperationChange?: (operation: SmartCrudOperation | null) => void;
}

// Stable defaults — inline `{}` fallbacks would change identity on every
// render and cascade into grid data reloads via the filter memos below.
const EMPTY_INITIAL_FILTERS: Record<string, string> = {};
const EMPTY_COMPUTED_VALUES: Record<string, unknown> = {};

function inferFilterOperator(field: Field): NonNullable<Field['selectedFilterOperation']> {
  if (field.selectedFilterOperation) {
    return field.selectedFilterOperation;
  }

  return field.valueType === 'string' ? 'contains' : '=';
}

function buildRoutingFilterRules(
  fields: Field[],
  initialFilters: Record<string, string>,
): Array<{ field: string; operator: string; value: string | number | boolean }> {
  return Object.entries(initialFilters).flatMap(([name, value]) => {
    const field = fields.find(
      (candidate) => candidate.name === name && candidate.filterable !== false,
    );
    if (!field || value === '') {
      return [];
    }

    return [
      {
        field: name,
        operator: inferFilterOperator(field),
        value,
      },
    ];
  });
}

/**
 * Public export — wraps CrudPageInner in its own DialogStoreProvider so that
 * existing pages do not need to add a provider themselves.
 */
export const CrudPage = <T extends DataRecord = DataRecord>({
  resource,
  onFormDataChange,
  initialRecordId,
  initialIsNew,
  computedValues,
  initialFilters,
  onFiltersChange,
  formRef,
  onSelectionChanged,
  editDisabled,
  deleteDisabled,
  gridRef,
  onOperationChange,
}: CrudPageProps<T>) => (
  <DialogStoreProvider>
    <CrudPageInner
      resource={resource}
      onFormDataChange={onFormDataChange}
      initialRecordId={initialRecordId}
      initialIsNew={initialIsNew}
      computedValues={computedValues}
      initialFilters={initialFilters}
      onFiltersChange={onFiltersChange}
      formRef={formRef}
      onSelectionChanged={onSelectionChanged}
      editDisabled={editDisabled}
      deleteDisabled={deleteDisabled}
      gridRef={gridRef}
      onOperationChange={onOperationChange}
    />
  </DialogStoreProvider>
);

const CrudPageInner = <T extends DataRecord = DataRecord>({
  resource,
  onFormDataChange,
  initialRecordId = null,
  initialIsNew = false,
  computedValues = EMPTY_COMPUTED_VALUES as FormDataRecord,
  initialFilters = EMPTY_INITIAL_FILTERS,
  onFiltersChange,
  formRef: externalFormRef,
  onSelectionChanged: externalOnSelectionChanged,
  editDisabled,
  deleteDisabled,
  gridRef: externalGridRef,
  onOperationChange,
}: CrudPageProps<T>) => {
  const { t } = useCoreTranslation();
  const resolvedInputResource = useMemo(() => resolveCrudResource(resource), [resource]);
  const {
    events,
    resource: resolvedResource,
    fields,
    formFields,
    formRef,
    permissions,
    selectionState,
    presetState,
  } = useCrudPage(resolvedInputResource, externalFormRef);
  const datagridFields = useMemo(
    () => fields.filter((field) => field.isIdentity || field.visible !== false),
    [fields],
  );
  const routeAwareGridFields = useMemo(
    () =>
      datagridFields.map((field) => {
        const routeFilterValue = initialFilters[field.name];
        if (routeFilterValue === undefined) {
          if (field.filterValue === undefined) {
            return field;
          }

          return { ...field, filterValue: undefined };
        }

        return {
          ...field,
          filterValue: routeFilterValue,
          selectedFilterOperation: inferFilterOperator(field),
        };
      }),
    [datagridFields, initialFilters],
  );
  const routeAwareFilters = useMemo(
    () => [
      ...(resolvedResource.filter ?? []),
      ...buildRoutingFilterRules(routeAwareGridFields, initialFilters),
    ],
    [initialFilters, resolvedResource.filter, routeAwareGridFields],
  );

  const isInlineEditMode =
    resolvedResource.editMode === 'row' ||
    resolvedResource.editMode === 'cell' ||
    resolvedResource.editMode === 'batch';

  const viewMode = useMemo(
    () => resolveViewMode(resolvedResource.viewMode),
    [resolvedResource.viewMode],
  );
  const navigate = useNavigate();
  const location = useLocation();

  const hasMultipleSelection = (resolvedResource.bulkActions?.length ?? 0) > 0;
  const hasPresets = (resolvedResource.columnPresets?.length ?? 0) > 0;
  const hasAuditTrail = resolvedResource.auditTrail?.enabled === true;
  const { gridDetail, formDetail } = resolveResourceDetails(resolvedResource);

  const internalGridRef = React.useRef<GridHandle | null>(null);
  const gridRef = externalGridRef ?? internalGridRef;
  const [selectedRows, setSelectedRows] = useState<T[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    action: BulkAction | null;
  }>({ open: false, action: null });

  const {
    isOpen: dialogIsOpen,
    mode: dialogMode,
    rowData: dialogRowData,
    openDialog,
    closeDialog,
  } = useCrudDialogStore(resolvedResource.id);

  const [on, emit] = useEvents();
  const [operationVersion, setOperationVersion] = useState(0);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const refreshGrid = useCallback(() => {
    gridRef.current?.refresh();
  }, [gridRef]);

  const resetDialogOperation = useCallback(() => {
    closeDialog();
    onOperationChange?.(null);
  }, [closeDialog, onOperationChange]);

  const openAddDialog = useCallback(
    (rowData: DataRecord | null = null) => {
      setOperationVersion((current) => current + 1);
      openDialog('add', rowData);
      onOperationChange?.('create');
    },
    [onOperationChange, openDialog],
  );

  const openEditDialog = useCallback(
    (row: DataRecord) => {
      setOperationVersion((current) => current + 1);
      openDialog('edit', row);
      onOperationChange?.('edit');
    },
    [onOperationChange, openDialog],
  );

  const openViewDialog = useCallback(
    (row: DataRecord) => {
      setOperationVersion((current) => current + 1);
      openDialog('view', row);
      onOperationChange?.('edit');
    },
    [onOperationChange, openDialog],
  );

  // Page-mode: derive the bare list URL by stripping the trailing /:id or /new
  // segment from the current path. Used as the navigation target for the
  // shell's Back/Cancel/Save buttons and the grid's New/Edit row actions.
  const listUrl = useMemo(() => {
    const path = location.pathname;
    if (initialRecordId != null) {
      return path.replace(new RegExp(`/${initialRecordId}$`), '') || path;
    }
    if (initialIsNew) {
      return path.replace(/\/new$/, '') || path;
    }
    return path;
  }, [location.pathname, initialRecordId, initialIsNew]);

  // User-initiated open/close requests. In dialog/drawer modes they dispatch
  // directly to the store; in page mode they navigate and the deep-link
  // effect below handles the store update.
  const requestNew = useCallback(() => {
    if (viewMode.mode === 'page') {
      navigate(`${listUrl}/new`);
    } else {
      openAddDialog(null);
    }
  }, [viewMode.mode, navigate, listUrl, openAddDialog]);

  const requestEdit = useCallback(
    (row: DataRecord) => {
      if (viewMode.mode === 'page') {
        const id = row['id'] ?? row['ID'];
        if (id == null) {
          openEditDialog(row);
          return;
        }
        navigate(`${listUrl}/${id}`);
      } else {
        openEditDialog(row);
      }
    },
    [viewMode.mode, navigate, listUrl, openEditDialog],
  );

  const requestView = useCallback(
    (row: DataRecord) => {
      if (viewMode.mode === 'page') {
        const id = row['id'] ?? row['ID'];
        if (id == null) {
          openViewDialog(row);
          return;
        }
        navigate(`${listUrl}/${id}`);
      } else {
        openViewDialog(row);
      }
    },
    [viewMode.mode, navigate, listUrl, openViewDialog],
  );

  const requestClose = useCallback(() => {
    if (viewMode.mode === 'page') {
      navigate(listUrl);
    } else {
      resetDialogOperation();
    }
  }, [viewMode.mode, navigate, listUrl, resetDialogOperation]);

  const routingActionsRef = React.useRef({ openAddDialog, openEditDialog, resetDialogOperation });
  routingActionsRef.current = { openAddDialog, openEditDialog, resetDialogOperation }; // eslint-disable-line react-hooks/refs

  // Deep-link: open the appropriate dialog on mount when routing props are provided.
  React.useEffect(() => {
    if (initialRecordId != null) {
      routingActionsRef.current.openEditDialog({ id: initialRecordId });
      return;
    }

    if (initialIsNew) {
      routingActionsRef.current.openAddDialog(null);
      return;
    }

    routingActionsRef.current.resetDialogOperation();
  }, [initialIsNew, initialRecordId]);

  // Subscribe to detail-grid row mutation events and call onDetailRowsChanged when defined.
  // The callback receives `formRef` so it can imperatively update header-form fields
  // (e.g. recalculate a `total` from line items).
  // Cleanup is handled automatically by useEvents' own unmount effect.
  const onDetailRowsChangedRef = React.useRef(resolvedResource.onDetailRowsChanged);
  onDetailRowsChangedRef.current = resolvedResource.onDetailRowsChanged;

  React.useEffect(() => {
    if (!onDetailRowsChangedRef.current) return;
    const handler = () => onDetailRowsChangedRef.current?.(formRef);
    const subs = [
      on(FORM_EVENTS.ROW_ADDED, handler),
      on(FORM_EVENTS.ROW_UPDATED, handler),
      on(FORM_EVENTS.ROW_REMOVED, handler),
    ];
    return () => subs.forEach((sub) => sub.unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dialogTitle = useMemo((): string => {
    const modeMap: Record<DialogMode, string> = {
      add: t('crudPage.dialogTitleAdd'),
      edit: t('crudPage.dialogTitleEdit'),
      view: t('crudPage.dialogTitleView'),
    };
    return modeMap[dialogMode] ?? t('crudPage.dialogTitleAdd');
  }, [dialogMode, t]);

  /** Bridge between the grid renderer's selection event and our selection state.
   * Also captures the selected row ID for the audit trail. */
  const handleSelectionChanged = (e: GridSelectionChange) => {
    const rows = (e.selectedRowsData ?? []) as DataRecord[];
    setSelectedRows(rows as T[]);
    selectionState.onSelectionChanged(rows);
    externalOnSelectionChanged?.(rows);
    if (hasAuditTrail) {
      const first = rows[0];
      if (first != null) {
        const id = (first['id'] ?? first['ID'] ?? null) as string | number | null;
        setSelectedRowId(id);
      }
    }
  };

  const auditUrl = useMemo(() => {
    if (!resolvedResource.auditTrail?.enabled || selectedRowId == null) return null;
    const { apiUrl } = resolvedResource.auditTrail;
    return typeof apiUrl === 'function' ? apiUrl(selectedRowId) : `${apiUrl}${selectedRowId}`;
  }, [resolvedResource.auditTrail, selectedRowId]);

  const executeBulkAction = useCallback(
    async (action: BulkAction) => {
      await action.onAction(selectionState.selectedIds);
      selectionState.clearSelection();
      refreshGrid();
    },
    [refreshGrid, selectionState],
  );

  const handleBulkAction = useCallback(
    (action: BulkAction) => {
      if (action.confirmMessage) {
        setConfirmState({ open: true, action });
      } else {
        void executeBulkAction(action);
      }
    },
    [executeBulkAction],
  );

  const toolbar = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs -- toolbar factories receive refs as opaque handles for event callbacks
    return resolveResourceToolbar(resolvedResource, {
      resource: resolvedResource,
      selectedRow: selectedRows[0],
      selectedRows,
      gridRef,
      formRef,
      events,
      emit,
    });
  }, [emit, events, formRef, gridRef, resolvedResource, selectedRows]);

  /** Preset selector rendered as a toolbar slot via `beforeToolbar`. */
  const renderPresetSelector = hasPresets
    ? () => (
        <ColumnPresetSelector
          resourceId={resolvedResource.id}
          presets={resolvedResource.columnPresets!}
          activePreset={presetState.activePreset}
          onPresetChange={presetState.setPreset}
          columnsLabel={t('crudPage.columnsLabel')}
          allColumnsLabel={t('crudPage.allColumns')}
        />
      )
    : undefined;

  return (
    <div
      id="wrapper"
      className={
        [
          auditOpen && 'wrapper--with-audit',
          viewMode.mode === 'page' && dialogIsOpen && 'wrapper--with-page',
        ]
          .filter(Boolean)
          .join(' ') || undefined
      }
    >
      {(resolvedResource.bulkActions?.length ?? 0) > 0 && selectionState.hasSelection && (
        <div className="nb-bulk-toolbar" role="toolbar" aria-label="Acciones en lote">
          <span className="nb-bulk-toolbar__count">
            {t('crudPage.selectedCount', { count: selectionState.selectedCount })}
          </span>
          {resolvedResource.bulkActions!.map((action: BulkAction) => (
            <Button
              key={action.key}
              variant="secondary"
              size="sm"
              icon={action.icon}
              onClick={() => handleBulkAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
      {hasAuditTrail && (
        <div className="nb-audit-trail-toolbar" style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setAuditOpen((prev) => !prev)}
            aria-pressed={auditOpen}
          >
            {t('crudPage.auditTrailButton')}
          </button>
        </div>
      )}
      <DataGridView
        ref={gridRef}
        id={resolvedResource.id}
        title={resolvedResource.title}
        url={resolvedResource.apiUrl}
        fields={routeAwareGridFields}
        events={events}
        allowAdd={permissions.canAdd}
        allowEdit={permissions.canEdit}
        allowView={permissions.canView}
        allowDelete={permissions.canDelete}
        allowExport={permissions.canExport}
        editDisabled={editDisabled}
        deleteDisabled={deleteDisabled}
        sort={resolvedResource.sort}
        filter={routeAwareFilters}
        paging={resolvedResource.paging}
        headerFilter={resolvedResource.headerFilter}
        mode={resolvedResource.mode}
        stateStoringEnabled={resolvedResource.stateStoring}
        toolbar={toolbar}
        rowActions={resolvedResource.rowActions as ResourceRowActions | undefined}
        onAdd={requestNew}
        onEdit={requestEdit}
        onView={requestView}
        onDelete={(row) => formRef.current?.deleteRow(row)}
        selectionMode={hasMultipleSelection ? 'multiple' : 'single'}
        onSelectionChanged={handleSelectionChanged}
        editMode={resolvedResource.editMode}
        visibleColumns={presetState.visibleColumns}
        beforeToolbar={renderPresetSelector}
        detailUrl={gridDetail?.url}
        detailFields={gridDetail?.fields}
        onFilterChange={onFiltersChange}
        adapter={resolvedResource.adapter}
        emptyState={resolvedResource.emptyState}
      />
      {!isInlineEditMode && (
        <CrudFormShell
          viewMode={viewMode}
          events={events}
          width={resolvedResource.dialogWidth}
          height={resolvedResource.dialogHeight}
          title={dialogTitle}
          isOpen={dialogIsOpen}
          mode={dialogMode}
          onClose={requestClose}
          onCancel={requestClose}
          onSave={() => formRef.current?.save()}
        >
          <FormView
            ref={formRef}
            url={resolvedResource.apiUrl}
            fields={formFields}
            events={events}
            detailFields={formDetail?.fields}
            detailUrl={formDetail?.url}
            detailPropertyName={formDetail?.propertyName}
            allowAdding={dialogMode !== 'view' && formDetail?.allowAdding}
            allowDeleting={dialogMode !== 'view' && formDetail?.allowDeleting}
            allowUpdating={dialogMode !== 'view' && formDetail?.allowUpdating}
            editable={dialogMode !== 'view'}
            requiredDetail={formDetail?.required}
            format={resolvedResource.format}
            onSaveSuccess={(response) => {
              resolvedResource.onSaveSuccess?.(response as T);
              requestClose();
              refreshGrid();
            }}
            onSaveError={resolvedResource.onSaveError}
            onDeleteSuccess={(response) => {
              resolvedResource.onDeleteSuccess?.(response as T);
              refreshGrid();
            }}
            onDeleteError={resolvedResource.onDeleteError}
            formLayout={resolvedResource.formLayout}
            presentationContext={{
              presentationMode: viewMode.mode,
              drawerWidth: viewMode.drawerWidth,
              dialogWidth: resolvedResource.dialogWidth,
              hasTabs: resolvedResource.formLayout?.type === 'tabs',
              hasMasterDetail: !!formDetail?.fields,
            }}
            computedValues={computedValues}
            onFieldDataChanged={onFormDataChange}
            adapter={resolvedResource.adapter}
            operation={
              dialogIsOpen
                ? dialogMode === 'add'
                  ? 'add'
                  : dialogMode === 'edit' || dialogMode === 'view'
                    ? 'edit'
                    : null
                : null
            }
            rowData={dialogRowData}
            operationVersion={operationVersion}
          />
        </CrudFormShell>
      )}
      {hasAuditTrail && (
        <AuditTrailPanel
          url={auditUrl}
          renderEntry={resolvedResource.auditTrail!.renderEntry}
          visible={auditOpen}
          onClose={() => setAuditOpen(false)}
        />
      )}
      <ConfirmDialog
        open={confirmState.open}
        title={t('crudPage.confirmActionTitle')}
        message={confirmState.action?.confirmMessage ?? ''}
        variant="warning"
        onConfirm={() => {
          const action = confirmState.action;
          setConfirmState({ open: false, action: null });
          if (action) void executeBulkAction(action);
        }}
        onCancel={() => setConfirmState({ open: false, action: null })}
      />
    </div>
  );
};
