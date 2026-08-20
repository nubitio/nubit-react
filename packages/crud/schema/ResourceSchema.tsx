import { createContext, useContext, useMemo } from 'react';
import type { DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { FormLayout } from '../form/FormLayout';
import type { ResourceFormDetail } from '../crud/ResourceConfig';

import { resolveSmartCrudFields } from '../crud/resolveSmartCrudFields';
import type { SmartCrudFieldContract } from '../crud/fieldContract';
import type { SummaryItem } from '../summary';
import { useFallbackResourceSchema } from './useFallbackResourceSchema';

/** Transport-neutral workflow metadata understood by CRUD renderers. */
export interface WorkflowTransitionSchema {
  name: string;
  from: string[];
  to: string;
  label?: string;
  roles?: string[];
}

export interface WorkflowSchema {
  field: string;
  transitions: WorkflowTransitionSchema[];
}

/** Transport-neutral master-detail metadata understood by CRUD renderers. */
export interface EmbeddedLinesSchema {
  propertyName: string;
  lineClass: string;
  lineEntityClass?: string;
  routePath: string;
  parentQueryParam: string;
  reloadUrl: string;
}

export interface ResourceSchemaRequest {
  apiUrl: string;
  /** When false, skip Hydra resolution (manual/contract fields). Default true. */
  enabled?: boolean;
}

export interface ResourceSchemaResolution {
  fields: Field[];
  isLoading: boolean;
  error: Error | undefined;
  supportedOperations: string[];
  formLayout?: FormLayout;
  workflow?: WorkflowSchema;
  summaryFields?: SummaryItem[];
  embeddedLines?: EmbeddedLinesSchema[];
  resolveFormDetail?: (formDetail?: ResourceFormDetail) => ResourceFormDetail | undefined;
}

export interface ResourceSchemaResolver {
  useResourceSchema(request: ResourceSchemaRequest): ResourceSchemaResolution;
}

export interface ResolveResourceFieldsOptions<T extends DataRecord = DataRecord> {
  apiUrl: string;
  manualFields?: Field[];
  fieldContract?: SmartCrudFieldContract<T>;
}

const ResourceSchemaResolverContext = createContext<ResourceSchemaResolver | null>(null);

export interface ResourceSchemaProviderProps {
  children: React.ReactNode;
  resolver: ResourceSchemaResolver;
}

export function ResourceSchemaProvider({ children, resolver }: ResourceSchemaProviderProps) {
  return (
    <ResourceSchemaResolverContext.Provider value={resolver}>
      {children}
    </ResourceSchemaResolverContext.Provider>
  );
}

function resolveWithRuntimeErrors(
  resolver: () => Field[],
  supportedOperations: string[] = [],
  formLayout?: FormLayout,
  workflow?: WorkflowSchema,
  summaryFields?: SummaryItem[],
  embeddedLines?: EmbeddedLinesSchema[],
  resolveFormDetail?: ResourceSchemaResolution['resolveFormDetail'],
): ResourceSchemaResolution {
  try {
    return {
      fields: resolver(),
      isLoading: false,
      error: undefined,
      supportedOperations,
      formLayout,
      workflow,
      summaryFields,
      embeddedLines,
      resolveFormDetail,
    };
  } catch (runtimeError) {
    return {
      fields: [],
      isLoading: false,
      error: runtimeError instanceof Error ? runtimeError : new Error(String(runtimeError)),
      supportedOperations,
      formLayout,
      workflow,
      summaryFields,
      embeddedLines,
      resolveFormDetail,
    };
  }
}

type FieldSource = 'manual-contract' | 'manual-fields' | 'hydra';

function resolveFieldSource<T extends DataRecord>(
  manualFields?: Field[],
  fieldContract?: SmartCrudFieldContract<T>,
): FieldSource {
  if (fieldContract?.source === 'manual') return 'manual-contract';
  if (manualFields && manualFields.length > 0) return 'manual-fields';
  return 'hydra';
}

export function useResolvedResourceFields<T extends DataRecord = DataRecord>({
  apiUrl,
  manualFields,
  fieldContract,
}: ResolveResourceFieldsOptions<T>): ResourceSchemaResolution {
  const schemaResolver = useContext(ResourceSchemaResolverContext);
  const fieldSource = resolveFieldSource(manualFields, fieldContract);
  const hydraEnabled = fieldSource === 'hydra';

  const fallbackResolver: ResourceSchemaResolver = useMemo(
    () => ({ useResourceSchema: useFallbackResourceSchema }),
    [],
  );
  const resolver = schemaResolver ?? fallbackResolver;
  const baseline = resolver.useResourceSchema({ apiUrl, enabled: hydraEnabled });
  // Manual header fields still need schema metadata for formDetail line inference
  // (x-embedded-lines) and toolbar permissions.
  const schemaMeta = resolver.useResourceSchema({ apiUrl, enabled: !hydraEnabled });

  return useMemo(() => {
    if (fieldSource === 'manual-contract') {
      const resolved = resolveWithRuntimeErrors(
        () => resolveSmartCrudFields({ contract: fieldContract }),
        schemaMeta.supportedOperations ?? [],
        schemaMeta.formLayout,
        schemaMeta.workflow,
        schemaMeta.summaryFields,
        schemaMeta.embeddedLines,
        schemaMeta.resolveFormDetail,
      );

      return {
        ...resolved,
        isLoading: schemaMeta.isLoading,
        error: resolved.error ?? schemaMeta.error,
      };
    }

    if (fieldSource === 'manual-fields') {
      return {
        fields: manualFields!,
        isLoading: schemaMeta.isLoading,
        error: schemaMeta.error,
        supportedOperations: schemaMeta.supportedOperations ?? [],
        embeddedLines: schemaMeta.embeddedLines,
        workflow: schemaMeta.workflow,
        formLayout: schemaMeta.formLayout,
        summaryFields: schemaMeta.summaryFields,
        resolveFormDetail: schemaMeta.resolveFormDetail,
      };
    }

    if (!schemaResolver) {
      return baseline;
    }

    if (baseline.isLoading || baseline.error) {
      return baseline;
    }

    return resolveWithRuntimeErrors(
      () =>
        resolveSmartCrudFields({
          baselineFields: baseline.fields,
          contract: fieldContract,
        }),
      baseline.supportedOperations,
      baseline.formLayout,
      baseline.workflow,
      baseline.summaryFields,
      baseline.embeddedLines,
      baseline.resolveFormDetail,
    );
  }, [baseline, fieldContract, fieldSource, manualFields, schemaMeta, schemaResolver]);
}
