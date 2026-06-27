import type { Field } from '@nubitio/crud';
import type { ResourceFormDetail } from '@nubitio/crud';
import { embeddedLinesUrl } from '@nubitio/crud';
import type { EmbeddedLinesSchema, HydraResourceSchema } from './types';
import { mapHydraSchemaToFields } from './HydraToFieldMapper';

export interface BuildEmbeddedFormDetailOptions {
  binding: EmbeddedLinesSchema;
  lineSchema?: HydraResourceSchema;
  resourceMap?: Record<string, HydraResourceSchema>;
  overrides?: Partial<Omit<ResourceFormDetail, 'fields' | 'url'>>;
}

/**
 * Builds a {@link ResourceFormDetail} from `x-embedded-lines` metadata and the
 * line entity schema in the API doc.
 */
export function buildEmbeddedFormDetail({
  binding,
  lineSchema,
  resourceMap,
  overrides,
}: BuildEmbeddedFormDetailOptions): ResourceFormDetail {
  const fields: Field[] = lineSchema
    ? mapHydraSchemaToFields(
        lineSchema,
        (className) => resourceMap?.[className]?.apiUrl,
        (className) => resourceMap?.[className],
      ).filter((field) => !field.isIdentity && field.name !== binding.parentQueryParam)
    : [];

  return {
    propertyName: binding.propertyName,
    url: embeddedLinesUrl(binding.routePath, binding.parentQueryParam),
    allowAdding: true,
    allowDeleting: true,
    allowUpdating: true,
    fields,
    ...overrides,
  };
}

export function resolveEmbeddedBinding(
  schema: HydraResourceSchema,
  propertyName?: string,
): EmbeddedLinesSchema | undefined {
  const bindings = schema.embeddedLines ?? [];
  if (bindings.length === 0) return undefined;
  if (!propertyName) return bindings[0];
  return bindings.find((b) => b.propertyName === propertyName) ?? bindings[0];
}