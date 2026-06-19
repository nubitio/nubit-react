import React, { createContext, useContext, useMemo } from 'react';
import type { DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { FormLayout } from '../form/FormLayout';
import type { FieldOverride } from '../crud/resolveSmartCrudFields';
import { resolveSmartCrudFields } from '../crud/resolveSmartCrudFields';
import type { SmartCrudFieldContract } from '../crud/fieldContract';
import type { WorkflowSchema } from '@nubitio/hydra';
import type { SummaryItem } from '../summary';

export interface ResourceSchemaRequest {
  apiUrl: string;
}

export interface ResourceSchemaResolution {
  fields: Field[];
  isLoading: boolean;
  error: Error | undefined;
  supportedOperations: string[];
  /**
   * Backend-declared form layout (sections/tabs) from the API doc, when the
   * resource publishes one. Explicit `ResourceConfig.formLayout` wins.
   */
  formLayout?: FormLayout;
  workflow?: WorkflowSchema;
  summaryFields?: SummaryItem[];
}

export interface ResourceSchemaResolver {
  useResourceSchema(request: ResourceSchemaRequest): ResourceSchemaResolution;
}

export interface ResolveResourceFieldsOptions<T extends DataRecord = DataRecord> {
  apiUrl: string;
  manualFields?: Field[];
  overrides?: FieldOverride[];
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
    };
  }
}

export function useResolvedResourceFields<T extends DataRecord = DataRecord>({
  apiUrl,
  manualFields,
  overrides,
  fieldContract,
}: ResolveResourceFieldsOptions<T>): ResourceSchemaResolution {
  const schemaResolver = useContext(ResourceSchemaResolverContext);

  // NOTE on conditional hooks: which branch executes is fixed for the lifetime
  // of a mounted component (a resource never changes its field source), so the
  // hook order stays consistent — the same invariant the conditional
  // `schemaResolver.useResourceSchema` call below already relies on.
  // Each branch memoises its resolution: returning a fresh `fields` array per
  // render cascades into grid data reloads and lookup refetches downstream
  // (everything keys on field identity).

  if (fieldContract?.source === 'manual') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMemo(
      () => resolveWithRuntimeErrors(() => resolveSmartCrudFields({ contract: fieldContract })),
      [fieldContract],
    );
  }

  if (manualFields && manualFields.length > 0) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMemo(
      () => ({
        fields: manualFields,
        isLoading: false,
        error: undefined,
        supportedOperations: [],
      }),
      [manualFields],
    );
  }

  if (!schemaResolver) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMemo(
      () => ({
        fields: [],
        isLoading: false,
        error: new Error(
          `No ResourceSchema resolver configured for ${apiUrl}. Wrap your app with ResourceSchemaProvider or a backend-specific provider such as HydraResourceSchemaProvider.`,
        ),
        supportedOperations: [],
      }),
      [apiUrl],
    );
  }

  const baseline = schemaResolver.useResourceSchema({ apiUrl });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMemo(() => {
    if (baseline.isLoading || baseline.error) {
      return baseline;
    }

    return resolveWithRuntimeErrors(
      () =>
        resolveSmartCrudFields({
          baselineFields: baseline.fields,
          contract: fieldContract,
          legacyOverrides: fieldContract ? undefined : overrides,
        }),
      baseline.supportedOperations,
      baseline.formLayout,
      baseline.workflow,
      baseline.summaryFields,
    );
  }, [baseline, fieldContract, overrides]);
}
