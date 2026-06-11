import { getCoreTimezone } from '@nubit/core';
import { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
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

/**
 * Pure serialization of form data before HTTP submission.
 *
 * Transforms raw form field values into the shape expected by the API:
 * - Applies uploaded file references
 * - Evaluates computed fields
 * - Resolves ENTITY fields via the BackendAdapter (default: Hydra IRIs)
 * - Formats DATE fields as YYYY-MM-DD business dates, with no timezone conversion
 * - Coerces numeric fields
 * - Strips NONE/FILE fields as appropriate
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

  const adapter = ctx.adapter ?? HydraAdapter;

  fields.forEach((field) => {
    if (field.type === FieldType.ENTITY || field.type === FieldType.TAGS) {
      serializeEntityField(formData, field, adapter);
      return;
    }

    if (field.type === FieldType.FILE) {
      serializeFileField(formData, field, ctx);
      return;
    }

    if (field.type === FieldType.NONE) {
      if (!field.isIdentity) {
        delete formData[field.name];
      }
      return;
    }

    if (field.type === FieldType.DATE) {
      serializeDateField(formData, field);
      return;
    }

    if (field.type === FieldType.TEXT && field.valueType === 'number') {
      formData[field.name] = Number(formData[field.name]);
    }

    if (field.type === FieldType.NUMBER || field.type === FieldType.CURRENCY) {
      serializeNumericField(formData, field);
    }
  });

  return formData;
}

function serializeEntityField(formData: FormDataRecord, field: Field, adapter: BackendAdapter): void {
  const val = formData[field.name];

  if (field.multiple) {
    if (Array.isArray(val)) {
      formData[field.name] = val.map((item) => adapter.serializeEntityRef(field, item));
    } else if (val !== null && val !== undefined && val !== '') {
      const serialized = adapter.serializeEntityRef(field, val);
      formData[field.name] = serialized !== undefined ? [serialized] : [];
    } else {
      delete formData[field.name];
    }
    return;
  }

  const serialized = adapter.serializeEntityRef(field, val);
  if (serialized === undefined) {
    delete formData[field.name];
  } else {
    formData[field.name] = serialized;
  }
}

function serializeFileField(formData: FormDataRecord, field: Field, ctx: SerializeFieldsContext): void {
  if (ctx.format === 'multipart' && ctx.getFieldValue) {
    const files = ctx.getFieldValue(field.name) as File[] | FileList | null | undefined;
    if (files && files.length > 0) {
      formData[field.name] = files[0];
    } else {
      delete formData[field.name];
    }
    return;
  }
  if (Array.isArray(formData[field.name])) {
    delete formData[field.name];
  }
}

function serializeDateField(formData: FormDataRecord, field: Field): void {
  const val = formData[field.name];
  if (val === null || val === undefined || val === '') {
    delete formData[field.name];
    return;
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    formData[field.name] = val;
    return;
  }
  if (val instanceof Date) {
    formData[field.name] = new Intl.DateTimeFormat('en-CA', {
      timeZone: getCoreTimezone(),
    }).format(val);
    return;
  }
  formData[field.name] = String(val).slice(0, 10);
}

function serializeNumericField(formData: FormDataRecord, field: Field): void {
  // Skip numeric coercion for the identity (primary key) field.
  // UUID / string keys must reach the URL builder as-is (BUG-011).
  if (field.isIdentity) return;

  if (field.sendAsString) {
    const val = formData[field.name];
    formData[field.name] = val != null ? Number(val).toFixed(field.precision || 2) : null;
  } else {
    formData[field.name] = Number(formData[field.name]);
  }
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
  const details = JSON.parse(JSON.stringify(rows)) as FormDataRecord[];

  detailFields.forEach((field) => {
    if (field.type === FieldType.ENTITY) {
      details.forEach((detail) => {
        const serialized = adapter.serializeEntityRef(field, detail[field.name]);
        if (serialized === undefined) {
          delete detail[field.name];
        } else {
          detail[field.name] = serialized;
        }
      });
    }

    if (field.type === FieldType.NUMBER || field.type === FieldType.CURRENCY) {
      details.forEach((detail) => {
        if (field.sendAsString) {
          const val = detail[field.name];
          detail[field.name] = val != null ? Number(val).toFixed(field.precision || 2) : null;
        } else {
          detail[field.name] = Number(detail[field.name]);
        }
      });
    }
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
