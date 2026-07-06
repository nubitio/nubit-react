import type { ResourceFormDetail } from '@nubitio/crud';
import { getSchemaResolver } from './HydraSchemaResolver';
import type { UseHydraMetadataResult } from './useHydraMetadata';
import type { HydraResourceSchema } from './types';

/**
 * Builds or augments `formDetail` from `x-embedded-lines` when the parent
 * resource publishes embedded line metadata. Thin entry point over
 * {@link HydraSchemaResolver.resolveFormDetail} for callers holding a raw
 * discovery result.
 */
export function resolveInferredFormDetail(
  apiUrl: string,
  formDetail: ResourceFormDetail | undefined,
  schemaData: UseHydraMetadataResult['data'],
  embeddedLines?: HydraResourceSchema['embeddedLines'],
): ResourceFormDetail | undefined {
  if (!schemaData) return formDetail;
  return getSchemaResolver(schemaData).resolveFormDetail(apiUrl, formDetail, embeddedLines);
}
