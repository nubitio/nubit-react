import type {
  HydraApiDoc,
  HydraEntrypointHrefs,
  HydraResourceSchema,
  HydraFieldSchema,
  HydraSupportedProperty,
  HydraSearchMapping,
  OpenApiDoc,
  OpenApiProperty,
} from './types';
import type { DataRecord } from '@nubitio/core';

/**
 * Converts a camelCase or PascalCase name to snake_case.
 * Examples:
 *   "Category"              → "category"
 *   "cashMovementCategory"  → "cash_movement_category"
 *   "CashMovementCategory"  → "cash_movement_category"
 *
 * @deprecated No longer used for URL generation — use {@link toDashCase} instead.
 *   Kept exported for backward compatibility with test files.
 */
export function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Converts a camelCase or PascalCase name to dash-case.
 * Mirrors API Platform's DashPathSegmentNameGenerator behaviour.
 * Examples:
 *   "Category"              → "category"
 *   "SunatCatalog"          → "sunat-catalog"
 *   "CashMovementCategory"  → "cash-movement-category"
 *   "cashMovementCategory"  → "cash-movement-category"
 */
export function toDashCase(name: string): string {
  return name
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * Pluralizes an English word (snake_case or lowercase) with common rules.
 *
 * - Words ending in a consonant + 'y'  → replace 'y' with 'ies'
 *     category  → categories, company → companies
 * - Words ending in s/x/z/ch/sh       → append 'es'
 *     branch    → branches, box → boxes
 * - Everything else                   → append 's'
 *     warehouse → warehouses, product → products
 */
export function pluralize(word: string): string {
  if (word.endsWith('y') && !['ay', 'ey', 'iy', 'oy', 'uy'].some((v) => word.endsWith(v))) {
    return word.slice(0, -1) + 'ies';
  }
  if (
    word.endsWith('s') ||
    word.endsWith('x') ||
    word.endsWith('z') ||
    word.endsWith('ch') ||
    word.endsWith('sh')
  ) {
    return word + 'es';
  }
  return word + 's';
}

/** Entrypoint property names that are already in plural form (dash-case). */
const ALREADY_PLURAL = new Set([
  'purchases',
  'sales',
  'invoices',
  'transfers',
  'movements',
  'shifts',
  'outbounds',
  'cash-movements',
  'cash-registers',
  'cash-shifts',
]);

/**
 * Derives the API URL from an Entrypoint property ID.
 * "#Entrypoint/branch"               -> "/api/branches"
 * "#Entrypoint/cashMovementCategory" -> "/api/cash-movement-categories"
 */
function deriveApiUrl(entrypointPropertyId: string): string {
  const name = entrypointPropertyId.split('/').pop() ?? '';
  const dashed = toDashCase(name);
  const plural = ALREADY_PLURAL.has(dashed) ? dashed : pluralize(dashed);
  return `/api/${plural}`;
}

/**
 * Safely extracts a string range from whatever `property.range` actually is.
 *
 * Real API Platform responses can return:
 *   - a plain string: "xmls:string", "#Company"
 *   - an IRI object: { "@id": "http://www.w3.org/2001/XMLSchema#string" }
 *   - null or undefined
 *   - a Hydra collection range array where the resource class lives under
 *     `owl:equivalentClass.owl:allValuesFrom.@id`
 */
export function normalizeRange(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const equivalentClass = (item as DataRecord)['owl:equivalentClass'];
      if (!equivalentClass || typeof equivalentClass !== 'object') continue;
      const allValuesFrom = (equivalentClass as DataRecord)['owl:allValuesFrom'];
      if (!allValuesFrom || typeof allValuesFrom !== 'object') continue;
      const id = (allValuesFrom as DataRecord)['@id'];
      if (typeof id === 'string') return id;
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const id = (raw as DataRecord)['@id'];
    if (typeof id === 'string') return id;
  }
  return undefined;
}

/**
 * Convert an OpenAPI property descriptor to a short-form xmls: range string.
 */
function mapOpenApiTypeToRange(prop: OpenApiProperty): string | undefined {
  if (prop.format === 'date-time') return 'xmls:dateTime';
  switch (prop.type) {
    case 'integer':
      return 'xmls:integer';
    case 'number':
      return 'xmls:decimal';
    case 'boolean':
      return 'xmls:boolean';
    case 'string':
      return 'xmls:string';
    default:
      return undefined;
  }
}

/**
 * Extracts the technical property name from a HydraSupportedProperty.
 *
 * The technical name (used in API JSON payloads) is found in sp.property['@id'],
 * which looks like "#Branch/businessName" or "#Category/name".
 * We extract the part after the last '/'.
 *
 * Fallback chain: @id suffix → property.label → title → ''
 */
function technicalName(sp: HydraSupportedProperty): string {
  const fromId = sp.property?.['@id']?.split('/').pop();
  if (fromId && fromId !== '') return fromId;
  // fallback chain: label → title
  return sp.property?.label ?? sp.title ?? '';
}

/**
 * Extract `hydra:search` mappings from a HydraClass.
 * Returns an empty array if the class has no `hydra:search` block,
 * or if any mapping entry is missing the required `hydra:property` field.
 * Never throws.
 */
function extractSearchMappings(cls: HydraApiDoc['supportedClass'][number]): HydraSearchMapping[] {
  const searchBlock = cls['hydra:search'];
  if (!searchBlock) return [];

  const mappings = searchBlock['hydra:mapping'] ?? [];
  const result: HydraSearchMapping[] = [];

  for (const mapping of mappings) {
    const property = mapping['hydra:property'];
    const variable = mapping['hydra:variable'];
    if (!property || !variable) continue; // skip incomplete entries

    result.push({
      property,
      variable,
      required: mapping['hydra:required'] ?? false,
    });
  }

  return result;
}

/**
 * Extract the HTTP method names from `supportedOperation` on a HydraClass.
 * Returns an uppercase string array, e.g. ['GET', 'POST', 'PATCH', 'DELETE'].
 * Returns an empty array when the class has no `supportedOperation` block.
 *
 * Wire format (confirmed from /api/docs.jsonld): compact key `supportedOperation`
 * (no `hydra:` prefix). API Platform compact context strips the namespace prefix.
 *
 * Accepts both `hydra:method` and `method` field names inside each operation entry
 * to be safe across different API Platform serialisation variants.
 */
function extractSupportedOperations(cls: HydraApiDoc['supportedClass'][number]): string[] {
  const operations = cls['supportedOperation'];
  if (!operations || operations.length === 0) return [];

  return operations
    .map((op) => (op['hydra:method'] ?? op['method'] ?? '').toUpperCase())
    .filter(Boolean);
}

function extractEntrypointCollectionOperations(doc: HydraApiDoc): Record<string, string[]> {
  const entrypoint = doc['supportedClass'].find((c) => c['@id'] === '#Entrypoint');
  if (!entrypoint) {
    return {};
  }

  const collectionOperations: Record<string, string[]> = {};

  for (const sp of entrypoint.supportedProperty ?? []) {
    const rawRange = sp.property?.range;
    const range = normalizeRange(rawRange);
    if (!range) {
      continue;
    }

    const className = range.replace('#', '');
    const operations = sp.property?.supportedOperation ?? [];
    collectionOperations[className] = operations
      .map((op) => (op['hydra:method'] ?? op['method'] ?? '').toUpperCase())
      .filter(Boolean);
  }

  return collectionOperations;
}

/**
 * Parse a raw `/api/docs.jsonld` Hydra JSON-LD response into a typed
 * Record<className, HydraResourceSchema>.
 *
 * @param entrypointHrefs - Optional map of entrypoint property name → real
 *   collection href, read from the API entrypoint document (`GET /api`).
 *   When provided it is the **authoritative** source for resource URLs;
 *   the dash-case + pluralize heuristic only fills the gaps. The heuristic
 *   cannot know the backend's path segment generator (underscores vs dashes)
 *   nor handle irregular plurals (Series, Settings, …), so always prefer
 *   passing the real hrefs.
 *
 * @throws Error if doc is not a valid Hydra ApiDocumentation.
 */
export function parseHydraDoc(
  doc: HydraApiDoc,
  entrypointHrefs?: HydraEntrypointHrefs,
): Record<string, HydraResourceSchema> {
  const result: Record<string, HydraResourceSchema> = {};
  const collectionOperationsMap = extractEntrypointCollectionOperations(doc);

  // Build URL map from the Entrypoint class
  const urlMap: Record<string, string> = {};
  const entrypoint = doc['supportedClass'].find((c) => c['@id'] === '#Entrypoint');
  if (entrypoint) {
    for (const sp of entrypoint.supportedProperty ?? []) {
      const rawRange = sp.property?.range;
      const range = normalizeRange(rawRange); // safely handles string | object | null | undefined
      const propId = sp.property?.['@id']; // e.g. "#Entrypoint/branch"
      if (range && propId) {
        const className = range.replace('#', '');
        const propName = propId.split('/').pop() ?? '';
        urlMap[className] = entrypointHrefs?.[propName] ?? deriveApiUrl(propId);
      }
    }
  }

  for (const cls of doc['supportedClass']) {
    if (cls['@id'] === '#Entrypoint') continue;

    const className = cls['@id'].replace('#', '');
    const fields: HydraFieldSchema[] = [];

    for (const sp of cls.supportedProperty ?? []) {
      const readable = sp.readable !== false;
      const writeable = sp.writeable !== false;

      // Skip fields that are not readable (write-only internal fields)
      if (!readable) continue;

      fields.push({
        name: technicalName(sp),
        range: normalizeRange(sp.property?.range),
        propertyType: sp.property?.['@type'] ?? 'rdf:Property',
        required: sp.required ?? false,
        readable,
        writeable,
        // Read the translated label from the OUTER SupportedProperty wrapper
        // (sp.title / sp['hydra:title']), NOT from sp.property which only
        // carries the raw technical property name in its `label` field.
        'hydra:title': sp['title'] ?? sp['hydra:title'] ?? undefined,
        // Forward x-crud hints injected by TranslatedDocumentationNormalizer.
        crudHints: sp['x-crud'],
        enumOptions: Array.isArray(sp['enum']) ? sp['enum'] : undefined,
      });
    }

    result[className] = {
      className,
      apiUrl: urlMap[className] ?? `/api/${pluralize(toDashCase(className))}`,
      fields,
      formLayout: cls['x-crud-layout'],
      workflow: cls['x-workflow'],
      sequence: cls['x-sequence'],
      searchMappings: extractSearchMappings(cls),
      supportedOperations: Array.from(
        new Set([
          ...(collectionOperationsMap[className] ?? []),
          ...extractSupportedOperations(cls),
        ]),
      ),
    };
  }

  return result;
}

/**
 * Parse a raw `/api/docs.json` OpenAPI 3.1 response into the same
 * Record<className, HydraResourceSchema> output shape so that
 * `useResourceSchema` can consume it transparently.
 */
export function parseOpenApiDoc(doc: OpenApiDoc): Record<string, HydraResourceSchema> {
  const result: Record<string, HydraResourceSchema> = {};

  for (const [className, schema] of Object.entries(doc.components?.schemas ?? {})) {
    const fields: HydraFieldSchema[] = [];
    const required = new Set(schema.required ?? []);

    for (const [fieldName, prop] of Object.entries(schema.properties ?? {})) {
      const readable = !prop.writeOnly;
      const writeable = !prop.readOnly;

      // Skip write-only fields (not readable in the UI)
      if (!readable) continue;

      fields.push({
        name: fieldName,
        range: mapOpenApiTypeToRange(prop), // convert OpenAPI type/format → xmls: string
        propertyType: 'rdf:Property',
        required: required.has(fieldName),
        readable,
        writeable,
        enumOptions: Array.isArray(prop.enum) ? prop.enum : undefined,
      });
    }

    result[className] = {
      className,
      apiUrl: `/api/${pluralize(toDashCase(className))}`, // best-effort; no Entrypoint in OpenAPI
      fields,
    };
  }

  return result;
}
