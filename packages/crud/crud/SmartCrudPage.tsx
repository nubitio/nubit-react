import React, { useMemo, useEffect, useRef, type RefObject } from 'react';
import type { SmartCrudHydraFieldContract } from './fieldContract';
import type { FieldOverride } from './resolveSmartCrudFields';
import { useQueryClient } from '@tanstack/react-query';
import { CrudPage } from './CrudPage';
import type { ResourceConfig } from './ResourceConfig';
import { buildFields } from '../field/buildFields';
import type { FieldInput } from '../field/buildFields';

import { useRouting } from './routing/useRouting';
import { logDevHint } from './devHint';
import { useCoreTranslation, useMercureSubscription } from '@nubitio/core';
import { parseHydraDoc, parseOpenApiDoc, resolveInferredFormDetail, useSchemaContext } from '@nubitio/hydra';
import { Button, Skeleton } from '@nubitio/ui';
import { resolveCrudResource } from './resolveCrudResource';
import { useSmartCrudRoles } from './SmartCrudRolesContext';
import { useSmartCrudOperation } from './useSmartCrudOperation';
import { useSmartCrudFields } from './useSmartCrudFields';
import { applyFormDetailFormFieldOverrides } from './applyFormDetailFormFieldOverrides';
import type { DataRecord } from '@nubitio/core';
import type { FormHandle } from '../form/FormHandle';
import type { GridHandle } from '../datagrid/GridHandle';
import { useResolvedResourceFields } from '../schema/ResourceSchema';
import { buildWorkflowRowActions } from '../workflow/buildWorkflowRowActions';
import { useDevTools, type FieldResolutionSource } from '../devtools/DevToolsContext';
import { resolveFormDetailDiagnostics } from '../devtools/formDetailDiagnostics';
import { warnOnce } from './deprecations';
import './SmartCrudPage.scss';

function CrudSkeleton() {
  return (
    <div className="nb-smart-crud-fallback">
      <Skeleton variant="rect" height={32} width="33%" />
      <Skeleton variant="rect" height={256} />
    </div>
  );
}

function CrudError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useCoreTranslation();

  return (
    <div className="nb-smart-crud-fallback nb-smart-crud-fallback--error" role="alert">
      <p className="nb-smart-crud-fallback__title">{t('crudPage.schemaErrorTitle')}</p>
      <p className="nb-smart-crud-fallback__message">{t('crudPage.schemaErrorMessage')}</p>
      <details className="nb-smart-crud-fallback__details">
        <summary>{t('crudPage.schemaErrorDetails')}</summary>
        <pre>{message}</pre>
      </details>
      <Button onClick={onRetry} variant="secondary" size="sm">
        {t('crudPage.schemaErrorRetry')}
      </Button>
    </div>
  );
}

export interface SchemaCrudPageProps<T extends DataRecord = DataRecord> {
  resource: ResourceConfig<T>;
  /** External form ref forwarded to CrudPage — lets the parent call setFieldValue / getFieldValue. */
  formRef?: RefObject<FormHandle | null>;
  /** Called whenever grid row selection changes. Receives the full selected row objects. */
  onSelectionChanged?: (rows: DataRecord[]) => void;
  /** Disables the edit action on every grid row. */
  editDisabled?: boolean;
  /** Disables the delete action on every grid row. */
  deleteDisabled?: boolean;
  /** External ref forwarded to the DataGridView — allows the parent to call
   *  showLoading / hideLoading / refresh / getSelectedRow imperatively. */
  gridRef?: RefObject<GridHandle | null>;
  /** Custom UI above the grid table — KPI cards, banners. Overrides `resource.aboveGrid`. */
  aboveGrid?: ResourceConfig<T>['aboveGrid'];
}

type RoutingFilters = Record<string, string>;

function formatRuntimeErrorMessage(error: Error): string {
  const issues = 'issues' in error && Array.isArray(error.issues) ? error.issues : [];
  return issues.length > 0 ? `${error.message} ${issues.join(' ')}` : error.message;
}

/**
 * SchemaCrudPage — wraps CrudPage with Hydra schema auto-discovery and declarative rules.
 *
 * ## Field resolution
 * - If `resource.fields` is a non-empty array, it is used as-is (pass-through).
 * - If `resource.fields` is empty / absent, fields are inferred from the Hydra
 *   API spec at `/api/docs.json` via `useResourceSchema`.
 * - While the schema loads: renders a skeleton loader.
 * - If the schema fetch errors: renders a user-visible error with a retry button.
 *
 * ## Declarative rules pipeline (via `useSmartCrudFields`)
 *   1. `useFieldPermissions` — RBAC: hides or disables fields based on user roles
 *   2. `useConditionalRules` — evaluates visibleWhen / disabledWhen / computed
 *   3. `useDependsOn`        — invalidates entity queries when dependency fields change
 *
 * ## Operation & form state (via `useSmartCrudOperation`)
 *   Manages `activeOperation` + `formData` as a unified state pair, synced
 *   from routing changes and the resource event bus (ADD/EDIT/CANCEL/SUCCESS).
 *
 * URL deep-linking is wired via `initialRecordId` / `initialIsNew` props on CrudPage.
 */
export function SchemaCrudPage<T extends DataRecord = DataRecord>({
  resource,
  formRef,
  onSelectionChanged,
  editDisabled,
  deleteDisabled,
  gridRef,
  aboveGrid,
}: SchemaCrudPageProps<T>) {
  const queryClient = useQueryClient();
  const { registerResource } = useDevTools();
  const internalGridRef = useRef<GridHandle | null>(null);
  const effectiveGridRef = gridRef ?? internalGridRef;

  const { data: schemaData } = useSchemaContext();

  const hasManualFields =
    !resource.fieldContract &&
    Array.isArray(resource.fields) &&
    resource.fields.length > 0;

  const {
    fields,
    isLoading,
    error,
    supportedOperations,
    formLayout: inferredFormLayout,
    workflow,
    summaryFields: inferredSummaryFields,
    embeddedLines,
  } = useResolvedResourceFields({
    apiUrl: resource.apiUrl,
    manualFields: hasManualFields ? buildFields(resource.fields as FieldInput[]) : undefined,
    fieldContract: resource.fieldContract,
  });

  const awaitingFormDetailInference = useMemo(() => {
    const detail = resource.formDetail;
    if (!detail || detail.inferFields === false) return false;
    if (detail.fields && detail.fields.length > 0) return false;
    if ((embeddedLines?.length ?? 0) > 0) return true;
    if (!schemaData) return false;

    const resourceMap =
      schemaData.format === 'hydra'
        ? parseHydraDoc(schemaData.doc, schemaData.entrypointHrefs)
        : parseOpenApiDoc(schemaData.doc);
    const normalizedApi = resource.apiUrl.split('?')[0].replace(/^\//, '');
    const parentSchema = Object.values(resourceMap).find((entry) => {
      const candidate = entry.apiUrl.split('?')[0].replace(/^\//, '');
      return candidate === normalizedApi;
    });

    return (parentSchema?.embeddedLines?.length ?? 0) > 0;
  }, [embeddedLines, resource.apiUrl, resource.formDetail, schemaData]);

  const resolvedBaseResource = useMemo(() => {
    const withFormDetail = {
      ...resource,
      formDetail: resolveInferredFormDetail(
        resource.apiUrl,
        resource.formDetail,
        schemaData,
        embeddedLines,
      ),
    };
    return resolveCrudResource(withFormDetail);
  }, [embeddedLines, resource, schemaData]);

  // Dev hint: log a defineResource() snippet once per resource URL when fields
  // were auto-inferred. No-op in production.
  const hintFiredRef = useRef(false);
  useEffect(() => {
    if (
      !resource.fieldContract &&
      !hasManualFields &&
      !isLoading &&
      !error &&
      fields.length > 0 &&
      !hintFiredRef.current
    ) {
      hintFiredRef.current = true;
      logDevHint(resource.apiUrl, fields, supportedOperations);
    }
  }, [
    resource.fieldContract,
    hasManualFields,
    isLoading,
    error,
    fields,
    resource.apiUrl,
    supportedOperations,
  ]);

  const formDetailDiagnostics = useMemo(
    () =>
      resolveFormDetailDiagnostics(
        resource.formDetail,
        resolvedBaseResource.formDetail,
        embeddedLines,
      ),
    [embeddedLines, resolvedBaseResource.formDetail, resource.formDetail],
  );

  useEffect(() => {
    if (isLoading || error || fields.length === 0) return;

    let source: FieldResolutionSource = 'unknown';
    if (resource.fieldContract?.source === 'manual') {
      source = 'fieldContract';
    } else if (hasManualFields) {
      source = 'manual';
    } else {
      source = 'hydra';
    }

    const permissionsSource = resource.permissions ? 'explicit' : supportedOperations.length > 0 ? 'inferred' : 'default';

    registerResource({
      apiUrl: resource.apiUrl,
      source,
      fields,
      supportedOperations,
      permissionsSource,
      formDetail: formDetailDiagnostics.active ? formDetailDiagnostics : undefined,
      updatedAt: Date.now(),
    });
  }, [
    error,
    fields,
    formDetailDiagnostics,
    hasManualFields,
    isLoading,
    registerResource,
    resource.apiUrl,
    resource.fieldContract?.source,
    resource.permissions,
    supportedOperations,
  ]);

  // Routing
  const routingState = useRouting(resource.routing);

  // Operation + form data state (unified)
  const {
    activeOperation,
    formData,
    handleFormDataChange,
    startCreate,
    startEdit,
    resetOperation,
  } = useSmartCrudOperation(undefined, routingState);

  // Roles
  const roles = useSmartCrudRoles();
  const stableRoles = useMemo(() => roles ?? [], [roles]);

  // Declarative rules pipeline
  const { gridFields, processedFields, computedValues } = useSmartCrudFields(
    fields,
    activeOperation,
    formData,
    stableRoles,
  );

  const formFields = useMemo(
    () => applyFormDetailFormFieldOverrides(processedFields, resolvedBaseResource.formDetail),
    [processedFields, resolvedBaseResource.formDetail],
  );

  // Real-time Mercure subscription
  useMercureSubscription(
    resource.apiUrl,
    () => {
      effectiveGridRef.current?.refresh();
    },
    resolvedBaseResource.mercure !== false,
  );

  // Normalize apiUrl — ensure it always starts with '/'
  const normalizedApiUrl = resolvedBaseResource.apiUrl.startsWith('/')
    ? resolvedBaseResource.apiUrl
    : `/${resolvedBaseResource.apiUrl}`;

  const resolvedResource = useMemo(() => {
    const rowActions =
      resolvedBaseResource.rowActions ??
      (workflow
        ? (row: T) =>
            buildWorkflowRowActions(row, workflow, normalizedApiUrl, stableRoles, () => {
              effectiveGridRef.current?.refresh();
            })
        : undefined);

    return {
      ...resolvedBaseResource,
      ...(!hasManualFields ? { fields: gridFields } : {}),
      apiUrl: normalizedApiUrl,
      fields: hasManualFields ? buildFields(resource.fields as FieldInput[]) : gridFields,
      formFields,
      // Backend-declared layout from the API doc; explicit config wins.
      formLayout: resolvedBaseResource.formLayout ?? inferredFormLayout,
      summaryFields: resolvedBaseResource.summaryFields ?? inferredSummaryFields,
      _supportedOperations: supportedOperations,
      rowActions,
    } as ResourceConfig<T>;
  }, [
    effectiveGridRef,
    fields,
    gridFields,
    hasManualFields,
    inferredFormLayout,
    inferredSummaryFields,
    normalizedApiUrl,
    formFields,
    resolvedBaseResource,
    resource.fields,
    stableRoles,
    supportedOperations,
    workflow,
  ]);

  // --- Render ---

  const inferredFormDetailFieldCount = resolvedBaseResource.formDetail?.fields?.length ?? 0;

  if (
    (!hasManualFields && isLoading) ||
    (awaitingFormDetailInference &&
      (!schemaData || inferredFormDetailFieldCount === 0))
  ) {
    return <CrudSkeleton />;
  }

  if (!hasManualFields && error) {
    return (
      <CrudError
        message={formatRuntimeErrorMessage(error)}
        onRetry={() => queryClient.invalidateQueries()}
      />
    );
  }

  return (
    <CrudPage
      resource={resolvedResource}
      onFormDataChange={handleFormDataChange}
      computedValues={computedValues}
      initialRecordId={routingState.initialRecordId}
      initialIsNew={routingState.initialIsNew}
      initialFilters={routingState.initialFilters}
      onFiltersChange={routingState.syncFilters as (filters: RoutingFilters) => void}
      formRef={formRef}
      onSelectionChanged={onSelectionChanged}
      editDisabled={editDisabled}
      deleteDisabled={deleteDisabled}
      gridRef={effectiveGridRef}
      aboveGrid={aboveGrid ?? resource.aboveGrid}
      onOperationChange={(operation) => {
        if (operation === 'create') {
          startCreate();
          return;
        }
        if (operation === 'edit') {
          startEdit();
          return;
        }
        resetOperation();
      }}
    />
  );
}

/** @deprecated Use {@link SchemaCrudPageProps} instead. */
export interface SmartCrudPageProps<T extends DataRecord = DataRecord> extends SchemaCrudPageProps<T> {
  /**
   * @deprecated Use `defineFieldContract()` / `defineFields()` on the resource instead.
   */
  fieldOverrides?: FieldOverride[];
}

function fieldOverridesToContract<T extends DataRecord>(
  overrides: FieldOverride[],
): SmartCrudHydraFieldContract<T> {
  return {
    source: 'hydra',
    strategy: 'augment',
    directives: overrides.map(({ key, ...patch }) => ({
      kind: 'override' as const,
      key,
      patch,
    })),
  } as unknown as SmartCrudHydraFieldContract<T>;
}

/**
 * @deprecated Renamed to {@link SchemaCrudPage}. Will be removed in v1.0.
 */
export function SmartCrudPage<T extends DataRecord = DataRecord>({
  fieldOverrides,
  resource,
  ...props
}: SmartCrudPageProps<T>) {
  warnOnce(
    'SmartCrudPage',
    'SmartCrudPage is deprecated — use SchemaCrudPage instead (same props, clearer name).',
  );

  const resolvedResource = useMemo(() => {
    if (!fieldOverrides?.length) return resource;

    warnOnce(
      'fieldOverrides',
      'fieldOverrides prop is deprecated — use defineFieldContract() on the resource instead.',
    );

    if (resource.fieldContract) return resource;

    return {
      ...resource,
      fieldContract: fieldOverridesToContract<T>(fieldOverrides),
    };
  }, [fieldOverrides, resource]);

  return <SchemaCrudPage resource={resolvedResource} {...props} />;
}
