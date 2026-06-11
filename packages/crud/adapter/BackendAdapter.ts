import type { DataRecord } from '@nubit/core';
import type { Field } from '../field/Field';
import type { FormDataRecord } from '../form/FormDataSnapshot';

/**
 * Strategy object that abstracts backend-specific conventions from the CRUD engine.
 *
 * The engine ships with two built-in adapters:
 *   - `HydraAdapter`  — for API Platform / JSON-LD backends (default)
 *   - `RestAdapter`   — for plain OpenAPI / REST backends
 *
 * Provide a custom implementation on `ResourceConfig.adapter` to support any other backend.
 */
export interface BackendAdapter {
  /**
   * Extract the unique identifier from a data record.
   * Used by the grid to identify rows for edit/delete actions.
   *
   * @param record  - The data record returned by the API.
   * @param idField - The name of the identity field declared in the field list.
   */
  getRowId(record: DataRecord, idField: string): string | number;

  /**
   * Build the URL for a single-item operation (PATCH / DELETE).
   *
   * @param baseUrl - The collection URL from ResourceConfig.apiUrl.
   * @param id      - The value returned by getRowId().
   */
  buildItemUrl(baseUrl: string, id: string | number): string;

  /**
   * Serialize a single entity field value for API submission (POST / PATCH body).
   *
   * @param field    - The ENTITY field definition.
   * @param rawValue - The raw value stored in the form (object, IRI string, or scalar id).
   * @returns The serialized value to place in the request body, or undefined to omit the field.
   */
  serializeEntityRef(field: Field, rawValue: unknown): unknown;

  /**
   * Normalize an entity field value received from the API into the scalar key
   * expected by the form's select editor.
   *
   * @param rawValue - The raw value in the API response (IRI string, nested object, or scalar).
   * @param field    - The ENTITY field definition.
   * @returns The normalized scalar key (e.g. id number, IRI string, or the object unchanged for inline display).
   */
  normalizeEntityValue(rawValue: unknown, field: Field): unknown;

  /**
   * Extract the display key from an option record for entity select fields.
   * Used when matching a stored value against a list of loaded options.
   *
   * @param item  - An option record from the remote data source.
   * @param field - The ENTITY field definition.
   */
  getEntityOptionKey(item: DataRecord, field: Field): unknown;

  /**
   * Parse the collection response body into an items array and total count.
   * Used by the grid data source.
   *
   * @param response - The raw API response body.
   */
  parseListResponse(response: unknown): { items: DataRecord[]; total: number };

  /**
   * Synthesize a canonical IRI / key for an entity object that arrived without one.
   * Called during form data normalization when the object lacks the expected identity key.
   * Return undefined if synthesis is not possible.
   *
   * @param field       - The ENTITY field definition.
   * @param entityValue - The entity object from the API response.
   */
  synthesizeEntityKey(field: Field, entityValue: FormDataRecord): string | undefined;
}
