import { Field } from '../field/Field';
import { getFieldTypeModule } from '../field/registry/registry';
import type { SerializedFieldValue, SerializeFieldContext } from '../field/registry/FieldTypeModule';
import type { UploadedFile } from './UploadedFile';
import type { FormDataRecord } from './FormDataSnapshot';
import type { BackendAdapter } from '../adapter/BackendAdapter';
import { HydraAdapter } from '../adapter/HydraAdapter';

export interface SerializeFieldsContext {
  /** Files uploaded during the current form session. */
  uploadedFiles: UploadedFile[];
  /** Retrieves a field value imperatively (used for FILE fields in multipart mode). */
  getFieldValue?: (field: string) => unknown;
  /** Submission format; affects how FILE fields are handled. */
  format?: 'json' | 'multipart';
  /** Backend adapter controlling entity serialization. Defaults to HydraAdapter. */
  adapter?: BackendAdapter;
}

function applySerializedValue(
  formData: FormDataRecord,
  field: Field,
  result: SerializedFieldValue,
): void {
  if (result.kind === 'set') {
    formData[field.name] = result.value;
  } else if (result.kind === 'omit') {
    delete formData[field.name];
  }
}

/**
 * Pure serialization of form data before HTTP submission.
 *
 * Applies uploaded file references and computed fields, then delegates the
 * per-type wire format (entity refs, business dates, numeric coercion, file
 * handling, NONE stripping) to each field's Field-Type module.
 *
 * This function is extracted from useFormSubmit for testability.
 */
export function serializeFormFields(
  rawData: FormDataRecord,
  fields: Field[],
  ctx: SerializeFieldsContext,
): FormDataRecord {
  const formData = { ...rawData };

  // Apply uploaded file IRIs
  ctx.uploadedFiles.forEach((file) => {
    formData[file.name] = file.iri;
  });

  // Apply computed fields before transport-specific serialization so hidden
  // derived values are still submitted even when they are not rendered in the form.
  fields.forEach((field) => {
    if (!field.computed) return;
    const computedValue = field.computed(formData);
    if (computedValue !== undefined) {
      formData[field.name] = computedValue;
    }
  });

  const moduleCtx: SerializeFieldContext = {
    adapter: ctx.adapter ?? HydraAdapter,
    format: ctx.format,
    getFieldValue: ctx.getFieldValue,
  };

  fields.forEach((field) => {
    const result = getFieldTypeModule(field.type).serializeFormValue(
      field,
      formData[field.name],
      moduleCtx,
    );
    applySerializedValue(formData, field, result);
  });

  return formData;
}

/**
 * Serializes detail grid rows (entity refs, numeric coercion, identity cleanup).
 * Pure function — operates on an array of row records.
 */
export function serializeDetailRows(
  rows: FormDataRecord[],
  detailFields: Field[],
  detailIdField: string,
  isEditMode: boolean,
  adapter: BackendAdapter = HydraAdapter,
): FormDataRecord[] {
  const details = structuredClone(rows) as FormDataRecord[];

  detailFields.forEach((field) => {
    const typeModule = getFieldTypeModule(field.type);
    details.forEach((detail) => {
      applySerializedValue(detail, field, typeModule.serializeDetailValue(field, detail[field.name], adapter));
    });
  });

  // Remove identity field for new rows (string IDs are temp keys from ArrayStore)
  details.forEach((detail) => {
    if (!isEditMode) {
      delete detail[detailIdField];
    } else if (typeof detail[detailIdField] === 'string') {
      delete detail[detailIdField];
    }
  });

  return details;
}
