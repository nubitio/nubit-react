/**
 * TypeScript types that model a Hydra JSON-LD API documentation response.
 *
 * These are pure data types — no React, no hooks, no side effects.
 */

// ---------------------------------------------------------------------------
// Raw Hydra JSON-LD shapes (from /api/docs.jsonld)
// ---------------------------------------------------------------------------

export interface HydraProperty {
  '@id': string;
  '@type': string; // e.g. "rdf:Property", "Link"
  label: string;
  supportedOperation?: HydraSupportedOperation[];
  /**
   * In real API Platform responses this can be:
   *   - a plain string: "xmls:string", "#Company"
   *   - an IRI object: { "@id": "http://www.w3.org/2001/XMLSchema#string" }
   *   - null or undefined
   * Use normalizeRange() in openApiParser.ts to safely extract a string.
   */
  range?: unknown;
}

/**
 * UI display hints injected by the backend via `#[ApiProperty(openapiContext: ['x-crud' => [...]])]`.
 * All properties are optional — absent means "use inferred value".
 */
export interface CrudHints {
  /** Override whether the field is shown in the filter row. */
  filterable?: boolean;
  /** Override whether the field can be sorted in the grid. */
  sortable?: boolean;
  /** When true, the column is hidden from the grid by default (the form still shows the field). */
  hidden?: boolean;
  /** When false, the field is excluded from the create/edit form (the grid still shows the column). */
  visibleOnForm?: boolean;
  /** Column display order. */
  order?: number;
  /** Column width in pixels or as a CSS string. */
  width?: number;
  /**
   * Render hint. 'currency' maps decimals to a money control; 'image'/'file'
   * map media relations (nubitio/admin-bundle Media or compatible) to instant
   * upload controls that submit the media IRI.
   */
  format?: 'currency' | 'image' | 'file';
}

export interface HydraSupportedProperty {
  '@type': 'SupportedProperty';
  property: HydraProperty;
  /**
   * Human-readable translated label provided by the backend (e.g. via API
   * Platform `description` → `title` on the outer SupportedProperty wrapper).
   * This is the field we want for display — e.g. "Nombre" for a Spanish locale.
   * Preferred over the auto-derived capitalised property name when present.
   *
   * Note: the inner `property.label` holds the raw technical property name
   * (e.g. "name") and is NOT translated. Only the outer `title` / `hydra:title`
   * on this wrapper carries the translated human-readable label.
   */
  title: string;
  /**
   * Alternative JSON-LD key for the same translated title, present in some
   * API Platform response variants.
   */
  'hydra:title'?: string;
  required?: boolean;
  readable?: boolean;
  writeable?: boolean;
  /**
   * UI CRUD hints injected by `TranslatedDocumentationNormalizer` from
   * `#[ApiProperty(openapiContext: ['x-crud' => [...]])]` on the PHP entity.
   */
  'x-crud'?: CrudHints;
  /**
   * Allowed values forwarded by `TranslatedDocumentationNormalizer` from
   * `#[ApiProperty(openapiContext: ['enum' => [...]])]`. When present, the
   * field mapper renders a select control instead of a free-text input.
   */
  enum?: Array<string | number>;
}

/**
 * A single entry from `supportedOperation` on a Hydra class.
 * API Platform serialises the HTTP method as either `hydra:method` or `method`
 * depending on the AP version; we accept both so parsing never silently drops
 * an operation.
 *
 * Note: the outer array key is the compact `supportedOperation` (no `hydra:` prefix)
 * as confirmed from the /api/docs.jsonld wire format.
 */
export interface HydraSupportedOperation {
  'hydra:method'?: string;
  method?: string;
}

export interface HydraClass {
  '@id': string; // e.g. "#Branch"
  '@type': string; // e.g. "Class"
  title: string;
  supportedProperty: HydraSupportedProperty[];
  /**
   * Hydra search template describing server-side filterable query params.
   * Present on collection operations in API Platform JSON-LD responses.
   */
  'hydra:search'?: HydraSearchTemplate;
  /**
   * Supported HTTP operations for this class, e.g. GET, POST, PUT, PATCH, DELETE.
   * Used to infer canAdd / canEdit / canDelete permissions without manual config.
   *
   * Wire format (confirmed from /api/docs.jsonld): compact key `supportedOperation`
   * (no `hydra:` prefix). API Platform compact context strips the namespace prefix.
   */
  supportedOperation?: HydraSupportedOperation[];
}

/** Raw `hydra:IriTemplate` block found inside `hydra:search`. */
export interface HydraSearchTemplate {
  'hydra:mapping'?: HydraIriTemplateMapping[];
}

/** A single entry in `hydra:mapping`. */
export interface HydraIriTemplateMapping {
  /** The resource property this mapping targets, e.g. "name". */
  'hydra:property'?: string;
  /** The URL template variable, e.g. "name" or "order[createdAt]". */
  'hydra:variable'?: string;
  /** Whether this parameter is required. */
  'hydra:required'?: boolean;
}

export interface HydraApiDoc {
  '@context'?: string;
  '@id': string;
  '@type': 'ApiDocumentation' | 'hydra:ApiDocumentation';
  supportedClass: HydraClass[];
}

// ---------------------------------------------------------------------------
// Internal normalized types (used by mapper and ResourceSchema)
// ---------------------------------------------------------------------------

/** Normalized field descriptor derived from a HydraSupportedProperty */
export interface HydraFieldSchema {
  name: string;
  range?: string; // from property.range — e.g. "xmls:string", "#Company"
  propertyType: string; // from property["@type"] — "rdf:Property" | "Link"
  required: boolean;
  readable: boolean;
  writeable: boolean;
  /**
   * Human-readable label from `hydra:title` on the property descriptor.
   * When present and non-empty, the mapper uses this instead of the
   * auto-capitalised property name.
   */
  'hydra:title'?: string;
  /**
   * UI CRUD hints forwarded from `x-crud` on the raw `HydraSupportedProperty`.
   * When present, these values override inferred field properties in the mapper.
   */
  crudHints?: CrudHints;
  /** Allowed values (renders as a select). From `enum` on the supported property. */
  enumOptions?: Array<string | number>;
}

/**
 * A single entry from a Hydra `hydra:search` / `hydra:mapping` block.
 * Describes a query parameter accepted by the server for filtering.
 */
export interface HydraSearchMapping {
  /** The resource property name this filter applies to (e.g. "name", "status"). */
  property: string;
  /** The URL query parameter variable (e.g. "name", "order[createdAt]"). */
  variable: string;
  /** Whether the parameter is required by the server. */
  required: boolean;
}

/** Normalized resource descriptor derived from a HydraClass */
export interface HydraResourceSchema {
  className: string; // e.g. "Branch"
  apiUrl: string; // e.g. "/api/branches"
  fields: HydraFieldSchema[];
  /**
   * Filters discoverable from `hydra:search.hydra:mapping` on the collection
   * operation. Absent/empty means no server-side filter info was found.
   */
  searchMappings?: HydraSearchMapping[];
  /**
   * HTTP methods supported by this resource class, uppercased.
   * e.g. ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].
   * Derived from `supportedOperation` (compact wire key) in the Hydra API doc.
   * Empty array means no operation info was found (fall back to platform defaults).
   */
  supportedOperations?: string[];
}

// ---------------------------------------------------------------------------
// Raw OpenAPI 3.1 shapes (from /api/docs.json)
// ---------------------------------------------------------------------------

export interface OpenApiProperty {
  type?: string;
  format?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  enum?: string[];
}

export interface OpenApiSchema {
  properties?: Record<string, OpenApiProperty>;
  required?: string[];
}

export interface OpenApiDoc {
  openapi: string; // "3.x.x"
  components: {
    schemas: Record<string, OpenApiSchema>;
  };
}

// ---------------------------------------------------------------------------
// Discriminated union for the API discovery result
// ---------------------------------------------------------------------------

/**
 * Map of entrypoint property name → real collection href, read from the API
 * entrypoint document (`GET /api` → `{ "salesDocument": "/api/sales-documents", … }`).
 * This is the canonical source for resource URLs: when present it overrides
 * the dash-case + pluralize heuristic, which cannot know the backend's path
 * generator or handle irregular plurals.
 */
export type HydraEntrypointHrefs = Record<string, string>;

export type ApiDoc =
  | { format: 'hydra'; doc: HydraApiDoc; entrypointHrefs?: HydraEntrypointHrefs }
  | { format: 'openapi'; doc: OpenApiDoc };
