import type { ResourceFormDetail } from '@nubitio/crud';
import { buildEmbeddedFormDetail, resolveEmbeddedBinding } from './buildEmbeddedFormDetail';
import type { UseHydraMetadataResult } from './useHydraMetadata';
import { parseHydraDoc, parseOpenApiDoc } from './openApiParser';
import type { HydraResourceSchema } from './types';

function normalizeUrl(url: string): string {
  const base = url.split('?')[0];
  return base.startsWith('/') ? base.slice(1) : base;
}

function shouldInferFormDetail(
  formDetail: ResourceFormDetail | undefined,
  embeddedLines?: HydraResourceSchema['embeddedLines'],
): boolean {
  if (!embeddedLines?.length) return false;
  if (formDetail?.inferFields === false) return false;
  if (formDetail?.fields && formDetail.fields.length > 0) return false;
  return true;
}

/**
 * Builds or augments `formDetail` from `x-embedded-lines` when the parent
 * resource publishes embedded line metadata.
 *
 * Inference runs automatically when `x-embedded-lines` is present unless:
 * - `formDetail.inferFields === false` (explicit opt-out), or
 * - `formDetail.fields` is a non-empty manual array.
 */
export function resolveInferredFormDetail(
  apiUrl: string,
  formDetail: ResourceFormDetail | undefined,
  schemaData: UseHydraMetadataResult['data'],
  embeddedLines?: HydraResourceSchema['embeddedLines'],
): ResourceFormDetail | undefined {
  if (!shouldInferFormDetail(formDetail, embeddedLines) || !schemaData) {
    return formDetail;
  }

  const resourceMap =
    schemaData.format === 'hydra'
      ? parseHydraDoc(schemaData.doc, schemaData.entrypointHrefs)
      : parseOpenApiDoc(schemaData.doc);

  const parentSchema = Object.values(resourceMap).find(
    (schema) => normalizeUrl(schema.apiUrl) === normalizeUrl(apiUrl),
  );
  const binding = resolveEmbeddedBinding(
    {
      className: parentSchema?.className ?? '',
      apiUrl,
      fields: parentSchema?.fields ?? [],
      embeddedLines: parentSchema?.embeddedLines ?? embeddedLines,
    },
    formDetail?.propertyName,
  );
  if (!binding) return formDetail;

  const lineSchema = resourceMap[binding.lineClass];
  const { inferFields: _infer, fields: _fields, ...overrides } = formDetail ?? {};

  const built = buildEmbeddedFormDetail({
    binding,
    lineSchema,
    resourceMap,
    overrides,
  });

  return {
    ...built,
    ...formDetail,
    propertyName: built.propertyName,
    url: built.url,
    fields: built.fields,
  };
}