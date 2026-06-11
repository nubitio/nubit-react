import { useRef, useMemo } from 'react';
import { usePermissions } from './usePermissions';
import { useSelectionState } from './useSelectionState';
import { useColumnPreset } from './useColumnPreset';
import type { Field } from '../field/Field';
import type { FormHandle } from '../form/FormHandle';
import type { ResourceConfig } from './ResourceConfig';
import type { ResolvedPermissions } from './usePermissions';
import type { SelectionState } from './useSelectionState';
import type { ColumnPresetState } from './useColumnPreset';
import { resolveCrudResource, type ResolvedCrudResource } from './resolveCrudResource';
import type { DataRecord, FormEventNames } from '@nubit/core';

export function useCrudPage<T extends DataRecord = DataRecord>(
  resource: ResourceConfig<T>,
  externalFormRef?: React.RefObject<FormHandle | null>,
): {
  events: FormEventNames;
  resource: ResolvedCrudResource<T>;
  fields: Field[];
  formFields: Field[];
  formRef: React.RefObject<FormHandle | null>;
  permissions: ResolvedPermissions;
  selectionState: SelectionState & {
    onSelectionChanged: (rows: DataRecord[]) => void;
  };
  presetState: ColumnPresetState;
} {
  const resolvedResource = useMemo(() => resolveCrudResource(resource), [resource]);
  const events = resolvedResource.events;
  const _internalFormRef = useRef<FormHandle | null>(null);
  const formRef = externalFormRef ?? _internalFormRef;

  const fields = useMemo(
    () => (resolvedResource.fields ?? []) as Field[],
    [resolvedResource.fields],
  );

  const formFields = useMemo(
    () => (resolvedResource.formFields ?? fields) as Field[],
    [fields, resolvedResource.formFields],
  );

  const permissions = usePermissions(
    resolvedResource as ResourceConfig,
    resolvedResource._supportedOperations ?? [],
  );

  const identityFieldName = useMemo(() => {
    const identityField = fields.find((f) => f.isIdentity);
    return identityField?.name ?? 'id';
  }, [fields]);

  const selectionState = useSelectionState(identityFieldName);
  const presetState = useColumnPreset(resolvedResource as ResourceConfig);

  return {
    events,
    resource: resolvedResource,
    fields,
    formFields,
    formRef,
    permissions,
    selectionState,
    presetState,
  };
}
