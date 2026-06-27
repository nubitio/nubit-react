import type { Field } from '@nubitio/crud';
import type { HydraFieldSchema, HydraResourceSchema, CrudHints } from './types';
import {
  currencyField,
  textField,
  numberField,
  switchField,
  entityField,
  enumField,
  fileField,
  imageField,
  noneField,
  datetimeField,
} from '@nubitio/crud';
import { pluralize, toDashCase } from './openApiParser';
import { warnDeprecatedCrudHints } from './crudHintDeprecations';

/**
 * Returns true when the given `range` string declares an XSD integer type.
 * Supports both short-form `xmls:` prefixes and full XSD IRIs.
 *
 * Used to decide whether the `id` field should be a `numberField()` (integer
 * primary key) or a `textField()` (UUID / string primary key — safe default).
 */
function isIntegerRange(range: string | undefined): boolean {
  if (!range) return false;

  // Full XSD IRI  — e.g. http://www.w3.org/2001/XMLSchema#integer
  if (range.startsWith('http://www.w3.org/2001/XMLSchema#')) {
    const local = range.split('#').pop() ?? '';
    return local === 'integer' || local === 'int' || local === 'long';
  }

  // Short-form  — e.g. xmls:integer / xsd:int
  return (
    range === 'xmls:integer' ||
    range === 'xmls:int' ||
    range === 'xmls:long' ||
    range === 'xsd:integer' ||
    range === 'xsd:int' ||
    range === 'xsd:long'
  );
}

/**
 * Convert a camelCase or snake_case field name to a human-readable label.
 * Examples:
 *   "firstName"   → "First Name"
 *   "createdAt"   → "Created At"
 *   "x_resource"  → "X Resource"
 */
function toLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Determine the FieldType bucket for a given `range` string.
 *
 * Handles both the short-form `xmls:` prefix used by API Platform
 * AND the full XSD IRI form `http://www.w3.org/2001/XMLSchema#...`
 * that can appear when `property.range` is an IRI object `{ "@id": "..." }`
 * and has been normalised to a string by `normalizeRange`.
 *
 * Returns a string tag that the caller can switch on; not the FieldType enum
 * directly (to keep this function pure / dependency-free of FieldBuilders).
 */
type RangeTag = 'boolean' | 'dateTime' | 'integer' | 'decimal' | 'entity' | 'text';

export function resolveRangeTag(range: string | undefined, propertyType: string): RangeTag {
  if (!range) return 'text';

  // Full XSD IRI check — extract the local name after '#'
  if (range.startsWith('http://www.w3.org/2001/XMLSchema#')) {
    const local = range.split('#').pop() ?? '';
    if (local === 'boolean') return 'boolean';
    if (local === 'dateTime') return 'dateTime';
    if (local === 'integer') return 'integer';
    if (local === 'decimal' || local === 'float' || local === 'double') return 'decimal';
    if (local === 'string') return 'text';
    return 'text';
  }

  // Short-form xsd: prefix (standard XML Schema namespace, used by Hydra/JSON-LD)
  if (range === 'xsd:boolean') return 'boolean';
  if (range === 'xsd:dateTime' || range === 'xsd:date') return 'dateTime';
  if (range === 'xsd:integer' || range === 'xsd:int' || range === 'xsd:long') return 'integer';
  if (range === 'xsd:decimal' || range === 'xsd:float' || range === 'xsd:double') return 'decimal';
  if (range === 'xsd:string') return 'text';

  // Short-form xmls: prefix (internal convention used by openApiParser for OpenAPI JSON docs)
  if (range === 'xmls:boolean') return 'boolean';
  if (range === 'xmls:dateTime') return 'dateTime';
  if (range === 'xmls:integer') return 'integer';
  if (range === 'xmls:decimal') return 'decimal';
  if (range === 'xmls:string') return 'text';

  // Entity reference — local hash class ref "#SomeClass"
  if (range.startsWith('#')) return 'entity';

  // HTTP IRI that is NOT an XSD type → treat as entity class IRI
  if (range.startsWith('http')) return 'entity';

  // Link property type (no range prefix match)
  if (propertyType === 'Link') return 'entity';

  // Unknown / fallback
  return 'text';
}

/**
 * Apply `x-crud` backend hints on top of an already-built Field.
 *
 * Hints override inferred values; inference is the fallback when hints are absent.
 * Only properties that are explicitly set (`!== undefined`) are applied.
 *
 * `hidden: true` sets `visible: false` so the column is hidden in the grid.
 * `visibleOnForm: false` excludes the field from the create/edit form only.
 * `order` maps to the `Field.order` property used by native grid column ordering.
 */
function applyCrudHints(field: Field, hints: CrudHints | undefined, fieldName?: string): string[] {
  const applied: string[] = [];
  if (!hints) return applied;

  warnDeprecatedCrudHints(hints, fieldName ?? field.name);

  if (hints.filterable !== undefined) {
    field.filterable = hints.filterable;
    applied.push(`filterable=${hints.filterable}`);
  }
  if (hints.sortable !== undefined) {
    field.sortable = hints.sortable;
    applied.push(`sortable=${hints.sortable}`);
  }

  const hideInGrid = hints.hideInGrid ?? hints.hidden;
  if (hideInGrid) {
    field.visible = false;
    applied.push('hideInGrid');
  }

  const showInForm = hints.showInForm ?? hints.visibleOnForm;
  if (showInForm !== undefined) {
    field.visibleOnForm = showInForm;
    applied.push(`showInForm=${showInForm}`);
  }

  if (hints.readonly !== undefined) {
    field.readonly = hints.readonly;
    applied.push(`readonly=${hints.readonly}`);
  }

  if (hints.order !== undefined) {
    field.order = hints.order;
    applied.push(`order=${hints.order}`);
  }
  if (hints.width !== undefined) {
    field.width = hints.width;
    applied.push(`width=${hints.width}`);
  }

  return applied;
}

function stampMappingReason(field: Field, rule: string, hintSuffix?: string[]): void {
  const parts = [rule];
  if (hintSuffix && hintSuffix.length > 0) {
    parts.push(`x-crud: ${hintSuffix.join(', ')}`);
  }
  field.mappingReason = parts.join(' → ');
}

/**
 * Apply `x-sequence` hints: the server-allocated field is read-only and
 * excluded from create/edit forms (the listener assigns it on POST).
 */
function applySequenceHints(fields: Field[], schema: HydraResourceSchema): void {
  const sequenceField = schema.sequence?.field;
  if (!sequenceField) return;

  for (const field of fields) {
    if (field.name === sequenceField) {
      field.visibleOnForm = false;
      field.readonly = true;
    }
  }
}

function resolveEntityValueField(relatedSchema: HydraResourceSchema | undefined): string {
  if (!relatedSchema) return '_iri';

  const fieldNames = new Set(relatedSchema.fields.map((field) => field.name));
  if (fieldNames.has('id') || fieldNames.has('@id')) return '_iri';

  // Always use IRI-mode: API Platform always serialises "@id" on every item
  // regardless of whether an explicit "id" field appears in supportedProperty.
  // Using a non-IRI field like "code" as valueField causes the frontend to send
  // "/api/voucher-types/NIU" which the backend cannot resolve by code. (BUG)
  return '_iri';
}

function isStringLikeField(field: HydraFieldSchema): boolean {
  return (
    field.range === undefined ||
    field.range === 'xmls:string' ||
    field.range === 'xsd:string'
  );
}

function resolveEntityTextField(
  relatedSchema: HydraResourceSchema | undefined,
  valueField: string,
): string {
  if (!relatedSchema) return 'name';

  const preferredNames = ['name', 'businessName', 'description', 'fullNumber', 'title', 'series'];

  for (const fieldName of preferredNames) {
    const match = relatedSchema.fields.find(
      (field) => field.name === fieldName && isStringLikeField(field),
    );
    if (match) return match.name;
  }

  const firstStringField = relatedSchema.fields.find(
    (field) => field.name !== valueField && isStringLikeField(field),
  );
  if (firstStringField) return firstStringField.name;

  return valueField;
}

/**
 * Map a single HydraResourceSchema to an array of Field objects using the
 * existing field builder utilities.
 *
 * Mapping rules (in priority order):
 *  1. name === 'id' or name === '@id'  → always emit as a hidden identity field
 *                                         (visible: false, readonly: true, isIdentity: true)
 *                                         Required so native grids and forms always have a stable row key.
 *  2. readable: false                  → skip (already filtered upstream, but defensive)
 *  3. writeable: false (display-only)  → noneField
 *  4. range resolves to 'boolean'      → switchField
 *  5. range resolves to 'dateTime'     → datetimeField
 *  6. range resolves to 'integer'      → numberField with precision(0)
 *  7. range resolves to 'decimal'      → numberField
 *  8. range resolves to 'entity' OR propertyType === 'Link' → entityField
 *  9. range resolves to 'text' OR fallback  → textField
 *
 * For each field, `filterable` is `true` when the field's property name appears in
 * `schema.searchMappings` (from `hydra:search`). When `searchMappings` is empty
 * (e.g. the resource uses a catch-all data-grid filter that doesn't
 * enumerate field-level mappings), ALL fields default to `filterable: true`.
 *
 * After processing all schema fields, if no `id` field was found in the schema,
 * a synthetic hidden identity field is injected so the grid always has a key.
 *
 * @param schema - The Hydra resource schema to map.
 * @param urlLookup - Optional lookup function to resolve the API URL for a related
 *   entity class. When provided, Rule 8 uses this before falling back to the
 *   automatic pluralization heuristic. Example: `(cls) => resourceMap[cls]?.apiUrl`
 *
 * @pure — no React, no hooks, no side effects.
 */
export function mapHydraSchemaToFields(
  schema: HydraResourceSchema,
  urlLookup?: (className: string) => string | undefined,
  schemaLookup?: (className: string) => HydraResourceSchema | undefined,
): Field[] {
  const fields: Field[] = [];

  // Build a fast lookup set of filterable property names from hydra:search mappings.
  const filterableProperties = new Set((schema.searchMappings ?? []).map((m) => m.property));

  // Track whether the schema contained an explicit id / @id field.
  let hasIdField = false;

  for (const fieldSchema of schema.fields) {
    const { name, range, propertyType, required, readable, writeable } = fieldSchema;

    // Rule 1 — identity fields: always emit as hidden, read-only, identity field.
    // Type selection: use numberField() ONLY when the schema explicitly declares an
    // XSD integer range. For string/absent/unknown range (including UUID primary keys),
    // default to textField() so row keys remain stable. (BUG-011)
    if (name === 'id' || name === '@id') {
      hasIdField = true;
      const idBase = isIntegerRange(range)
        ? numberField().name('id').label('Id').required(false).precision(0).build()
        : textField().name('id').label('Id').required(false).build();
      const idField: Field = {
        ...idBase,
        isIdentity: true,
        visible: false,
        readonly: true,
        filterable: false,
        sortable: false,
        hideable: false,
        visibleOnForm: false,
      };
      stampMappingReason(
        idField,
        `rule-1 identity (${isIntegerRange(range) ? 'numberField' : 'textField'})`,
        applyCrudHints(idField, fieldSchema.crudHints),
      );
      fields.push(idField);
      continue;
    }

    // Rule 2 — defensive: skip non-readable fields (should be filtered by parser)
    if (!readable) {
      continue;
    }

    // Prefer the backend-provided hydra:title (translated label) when present —
    // but only when it actually differs from the raw property name: API
    // Platform defaults hydra:title to the property name itself, and showing
    // "name"/"sku" as column headers reads as unstyled. Otherwise humanise.
    const hydraTitle = fieldSchema['hydra:title'];
    const label =
      hydraTitle && hydraTitle.trim() !== '' && hydraTitle !== name ? hydraTitle : toLabel(name);
    const filterable = filterableProperties.size === 0 ? true : filterableProperties.has(name);

    // Rule 3 — display-only (writeable: false) → noneField. A `format:
    // 'currency'` hint still wins so computed money columns (totals) render
    // formatted instead of as raw text; the field stays readonly.
    if (!writeable) {
      const base =
        fieldSchema.crudHints?.format === 'currency'
          ? currencyField().readonly(true)
          : noneField();
      const built = base.name(name).label(label).required(required).build();
      const field: Field = { ...built, filterable };
      stampMappingReason(
        field,
        fieldSchema.crudHints?.format === 'currency' ? 'rule-3 display-only+currency' : 'rule-3 display-only',
        applyCrudHints(field, fieldSchema.crudHints),
      );
      fields.push(field);
      continue;
    }

    const tag = resolveRangeTag(range, propertyType);

    // Rule 3.5 — enum'd scalar → select control with the allowed values.
    // The backend forwards `openapiContext: ['enum' => [...]]` into the docs;
    // a free-text input for a closed value set is a validation error waiting
    // to happen. Option labels are humanised ('credit_note' → 'Credit Note').
    const enumOptions = fieldSchema.enumOptions;
    if (
      enumOptions &&
      enumOptions.length > 0 &&
      (tag === 'text' || tag === 'integer' || tag === 'decimal')
    ) {
      const built = enumField(
        enumOptions.map((value) => ({
          value,
          // Title-case each word: 'credit_note' → 'Credit Note', 'PEN' → 'PEN'.
          text: toLabel(String(value)).replace(/\b[a-z]/g, (c) => c.toUpperCase()),
        })),
      )
        .name(name)
        .label(label)
        .required(required)
        .build();
      const field: Field = { ...built, filterable };
      stampMappingReason(field, 'rule-3.5 enum', applyCrudHints(field, fieldSchema.crudHints));
      fields.push(field);
      continue;
    }

    // Rule 3.55 — `format: 'image' | 'file'` hint → upload field. The
    // property is a relation to a media resource (nubitio/admin-bundle's
    // Media or compatible: POST {base}media multipart, `path` is the public
    // URL, form submits the IRI). The upload URL derives from the resource's
    // own apiUrl base ('/api/products' → '/api/media').
    const formatHint = fieldSchema.crudHints?.format;
    if (formatHint === 'image' || formatHint === 'file') {
      const apiBase = schema.apiUrl.slice(0, schema.apiUrl.lastIndexOf('/') + 1);
      const base = formatHint === 'image' ? imageField(apiBase) : fileField(apiBase);
      const built = base.name(name).label(label).required(required).build();
      const field: Field = { ...built, filterable: false, sortable: false };
      stampMappingReason(
        field,
        `rule-3.55 ${formatHint}`,
        applyCrudHints(field, fieldSchema.crudHints),
      );
      fields.push(field);
      continue;
    }

    // Rule 3.6 — `format: 'currency'` hint → currencyField regardless of the
    // range: API Platform serializes Doctrine DECIMAL columns as xsd:string,
    // so the hint (not the range) is the reliable signal for money fields.
    if (
      fieldSchema.crudHints?.format === 'currency' &&
      (tag === 'text' || tag === 'integer' || tag === 'decimal')
    ) {
      const built = currencyField().name(name).label(label).required(required).build();
      const field: Field = { ...built, filterable };
      stampMappingReason(field, 'rule-3.6 currency', applyCrudHints(field, fieldSchema.crudHints));
      fields.push(field);
      continue;
    }

    // Rule 4 — boolean → switchField
    if (tag === 'boolean') {
      const built = switchField().name(name).label(label).required(required).build();
      const field: Field = { ...built, filterable };
      stampMappingReason(field, 'rule-4 boolean', applyCrudHints(field, fieldSchema.crudHints));
      fields.push(field);
      continue;
    }

    // Rule 5 — date-time → datetimeField
    if (tag === 'dateTime') {
      const built = datetimeField().name(name).label(label).required(required).build();
      const field: Field = { ...built, filterable };
      stampMappingReason(field, 'rule-5 dateTime', applyCrudHints(field, fieldSchema.crudHints));
      fields.push(field);
      continue;
    }

    // Rule 6 — integer → numberField with precision 0
    if (tag === 'integer') {
      const built = numberField().name(name).label(label).required(required).precision(0).build();
      const field: Field = { ...built, filterable };
      stampMappingReason(field, 'rule-6 integer', applyCrudHints(field, fieldSchema.crudHints));
      fields.push(field);
      continue;
    }

    // Rule 7 — decimal → numberField (currency-hinted decimals were already
    // taken by Rule 3.6).
    if (tag === 'decimal') {
      const built = numberField().name(name).label(label).required(required).build();
      const field: Field = { ...built, filterable };
      stampMappingReason(field, 'rule-7 decimal', applyCrudHints(field, fieldSchema.crudHints));
      fields.push(field);
      continue;
    }

    // Rule 8 — entity reference (range starts with '#' / http IRI) or Link type → entityField
    if (tag === 'entity' || propertyType === 'Link') {
      const resourceClass = range ? range.replace('#', '') : '';
      const relatedSchema = resourceClass ? schemaLookup?.(resourceClass) : undefined;
      // Derive the API URL: prefer the urlLookup (from the resource map) before
      // falling back to automatic pluralization heuristic.
      // e.g. Category → /api/categories, Branch → /api/branches, Product → /api/products
      const url = resourceClass
        ? (urlLookup?.(resourceClass) ?? `/api/${pluralize(toDashCase(resourceClass))}`)
        : '';
      const valueField = resolveEntityValueField(relatedSchema);
      const textField = resolveEntityTextField(relatedSchema, valueField);
      const built = entityField(url, valueField, textField)
        .name(name)
        .label(label)
        .required(required)
        .build();
      const field: Field = { ...built, filterable };
      stampMappingReason(
        field,
        `rule-8 entity → ${url || 'unknown-url'}`,
        applyCrudHints(field, fieldSchema.crudHints),
      );
      fields.push(field);
      continue;
    }

    // Rule 9 — xmls:string and unknown → textField (safe fallback)
    const built = textField().name(name).label(label).required(required).build();
    const field: Field = { ...built, filterable };
    stampMappingReason(field, `rule-9 text (range=${range ?? 'none'})`, applyCrudHints(field, fieldSchema.crudHints));
    fields.push(field);
  }

  // If the schema had no explicit id / @id property, inject a synthetic hidden
  // identity field so every grid/form row has a stable key to bind to.
  //
  // Use textField() — never numberField() — because UUIDs, slugs, and IRIs are
  // all strings.  A schema that genuinely uses a numeric id WILL have an explicit
  // id property with xsd:integer range, which is handled by Rule 1 above.
  // Defaulting to string prevents UUID keys from being coerced to NaN.
  // (BUG-011)
  if (!hasIdField) {
    const syntheticId: Field = {
      ...textField().name('id').label('Id').required(false).build(),
      isIdentity: true,
      visible: false,
      readonly: true,
      filterable: false,
      sortable: false,
      hideable: false,
      visibleOnForm: false,
    };
    stampMappingReason(syntheticId, 'rule-1b synthetic identity (no id in schema)');
    // Prepend so it appears first (conventional key position).
    fields.unshift(syntheticId);
  }

  applySequenceHints(fields, schema);

  return fields;
}
