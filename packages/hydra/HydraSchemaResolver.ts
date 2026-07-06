import type { Field, ResourceFormDetail, SummaryItem } from '@nubitio/crud';
import { buildEmbeddedFormDetail, resolveEmbeddedBinding } from './buildEmbeddedFormDetail';
import { buildSummaryFieldsFromSchema } from './buildSummaryFields';
import { mapHydraSchemaToFields } from './HydraToFieldMapper';
import { parseHydraDoc, parseOpenApiDoc } from './openApiParser';
import type { ApiDoc, HydraResourceSchema } from './types';

/**
 * Normalizes an API URL by stripping any leading slash and query string so that
 * 'api/categories', '/api/categories', and '/api/categories?foo=bar' are treated as equal.
 */
function normalizeUrl(url: string): string {
  const base = url.split('?')[0];
  return base.startsWith('/') ? base.slice(1) : base;
}

/** Everything the doc knows about one resource, resolved to crud vocabulary. */
export interface ResolvedResourceSchema {
  fields: Field[];
  supportedOperations: string[];
  error?: Error;
  formLayout?: HydraResourceSchema['formLayout'];
  workflow?: HydraResourceSchema['workflow'];
  sequence?: HydraResourceSchema['sequence'];
  summaryFields?: SummaryItem[];
  embeddedLines?: HydraResourceSchema['embeddedLines'];
}

function shouldInferFormDetail(formDetail: ResourceFormDetail | undefined): boolean {
  if (formDetail?.inferFields === false) return false;
  if (formDetail?.fields && formDetail.fields.length > 0) return false;
  return true;
}

/**
 * The schema-resolution seam of the hydra package: one API doc in, Fields and
 * inferred form detail out. Parsing, resource lookup, field mapping and
 * embedded-line inference are implementation — callers never sequence
 * `parse* → map → infer` themselves. Obtain instances via
 * {@link getSchemaResolver}, which parses each doc exactly once.
 */
export class HydraSchemaResolver {
  /** Parsed resource schemas keyed by class name. */
  readonly resourceMap: Record<string, HydraResourceSchema>;

  constructor(data: ApiDoc) {
    this.resourceMap =
      data.format === 'hydra'
        ? parseHydraDoc(data.doc, data.entrypointHrefs)
        : parseOpenApiDoc(data.doc);
  }

  /** The resource schema whose apiUrl matches (slash- and query-insensitive). */
  findResource(apiUrl: string): HydraResourceSchema | undefined {
    const normalizedInput = normalizeUrl(apiUrl);
    return Object.values(this.resourceMap).find(
      (schema) => normalizeUrl(schema.apiUrl) === normalizedInput,
    );
  }

  /** True when the doc publishes embedded-line metadata for the resource. */
  hasEmbeddedLines(apiUrl: string): boolean {
    return (this.findResource(apiUrl)?.embeddedLines?.length ?? 0) > 0;
  }

  /** The full doc → Field[] pipeline for one resource, or a diagnostic error. */
  resolveResource(apiUrl: string): ResolvedResourceSchema {
    const resourceSchema = this.findResource(apiUrl);
    if (!resourceSchema) {
      const knownUrls = Object.values(this.resourceMap)
        .map((schema) => schema.apiUrl)
        .sort();
      const normalizedInput = normalizeUrl(apiUrl);
      const slugMatch = knownUrls.find(
        (url) => normalizeUrl(url).replace(/[-_]/g, '') === normalizedInput.replace(/[-_]/g, ''),
      );
      return {
        fields: [],
        supportedOperations: [],
        error: new Error(
          `No schema found for ${apiUrl} in API doc.` +
            (slugMatch
              ? ` Did you mean ${slugMatch}? If your backend generates underscore paths, ` +
                `configure API Platform's dash generator (path_segment_name_generator: ` +
                `api_platform.metadata.path_segment_name_generator.dash) or update the ` +
                `frontend resource path to match.`
              : '') +
            ` Known resource URLs: ${knownUrls.join(', ') || '(none)'}`,
        ),
      };
    }

    const fields = mapHydraSchemaToFields(
      resourceSchema,
      (className) => this.resourceMap[className]?.apiUrl,
      (className) => this.resourceMap[className],
    );

    return {
      fields,
      supportedOperations: resourceSchema.supportedOperations ?? [],
      formLayout: resourceSchema.formLayout,
      workflow: resourceSchema.workflow,
      sequence: resourceSchema.sequence,
      summaryFields: buildSummaryFieldsFromSchema(resourceSchema),
      embeddedLines: resourceSchema.embeddedLines,
    };
  }

  /**
   * Builds or augments `formDetail` from `x-embedded-lines` when the parent
   * resource publishes embedded line metadata.
   *
   * Inference runs automatically when `x-embedded-lines` is present unless:
   * - `formDetail.inferFields === false` (explicit opt-out), or
   * - `formDetail.fields` is a non-empty manual array.
   */
  resolveFormDetail(
    apiUrl: string,
    formDetail: ResourceFormDetail | undefined,
    embeddedLines?: HydraResourceSchema['embeddedLines'],
  ): ResourceFormDetail | undefined {
    if (!shouldInferFormDetail(formDetail)) {
      return formDetail;
    }

    const parentSchema = this.findResource(apiUrl);
    const effectiveEmbeddedLines = parentSchema?.embeddedLines ?? embeddedLines;
    if (!effectiveEmbeddedLines?.length) return formDetail;

    const binding = resolveEmbeddedBinding(
      {
        className: parentSchema?.className ?? '',
        apiUrl,
        fields: parentSchema?.fields ?? [],
        embeddedLines: effectiveEmbeddedLines,
      },
      formDetail?.propertyName,
    );
    if (!binding) return formDetail;

    const lineSchema = this.resourceMap[binding.lineClass];
    const { inferFields: _infer, fields: _fields, ...overrides } = formDetail ?? {};

    const built = buildEmbeddedFormDetail({
      binding,
      lineSchema,
      resourceMap: this.resourceMap,
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
}

const RESOLVER_CACHE = new WeakMap<ApiDoc, HydraSchemaResolver>();

/**
 * The resolver for an API doc, parsed exactly once per doc object. Every
 * consumer of the same discovery result (useResourceSchema, form-detail
 * inference, SchemaCrudPage) shares one parse.
 */
export function getSchemaResolver(data: ApiDoc): HydraSchemaResolver {
  let resolver = RESOLVER_CACHE.get(data);
  if (!resolver) {
    resolver = new HydraSchemaResolver(data);
    RESOLVER_CACHE.set(data, resolver);
  }
  return resolver;
}
