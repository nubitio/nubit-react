import { serializeFormFields, serializeDetailRows } from './serializeFormData';
import type { UseFormSubmitAccessors } from './FormSubmitAccessors';
import type { UseFormSubmitOptions } from './FormSubmitOptions';
import { useCoreRuntime, useCoreTranslation } from '@nubitio/core';
import type { FormDataRecord } from './FormDataSnapshot';
import { FORM_ERRORS_EVENT } from './FormEvents';
import { extractApiErrorMessage } from './FormApiViolations';
import { HydraAdapter } from '../adapter/HydraAdapter';

/** Narrows an unknown rejection to the `{ status, data }` shape our http clients reject with. */
function readApiError(err: unknown): { status?: number; data?: unknown } | null {
  if (typeof err !== 'object' || err === null) return null;
  const record = err as Record<string, unknown>;
  return {
    status: typeof record['status'] === 'number' ? record['status'] : undefined,
    data: 'data' in record ? record['data'] : undefined,
  };
}

export type { UseFormSubmitAccessors } from './FormSubmitAccessors';
export type { UseFormSubmitOptions } from './FormSubmitOptions';

type DeletePayload = { row: FormDataRecord };

export type EmitFn = <T>(name: string, payload?: T) => void;

/**
 * Returns helpers for form serialization and HTTP submit/delete operations.
 * Delegates pure serialization to `serializeFormFields` / `serializeDetailRows`.
 */
export const useFormSubmit = (
  options: UseFormSubmitOptions,
  accessors: UseFormSubmitAccessors,
  emit: EmitFn,
  validateFn: () => boolean,
) => {
  const { t } = useCoreTranslation();
  const { notify } = useCoreRuntime();

  const adapter = options.adapter ?? HydraAdapter;
  const getIdField = () => options.fields.find((f) => f.isIdentity)?.name ?? '';
  const getDetailIdField = () => options.detailFields?.find((f) => f.isIdentity)?.name ?? '';

  /** Build multipart FormData from a plain object */
  const buildMultipartFormData = (data: FormDataRecord): FormData => {
    const form = new FormData();
    for (const key in data) {
      const value = data[key];
      if (value != null) {
        form.append(key, value instanceof Blob ? value : String(value));
      }
    }
    return form;
  };

  /** Serialize main form fields for submission */
  const serializeFields = (rawData: FormDataRecord): FormDataRecord => {
    return serializeFormFields(rawData, options.fields, {
      uploadedFiles: accessors.getUploadedFiles(),
      getFieldValue: accessors.getFieldValue,
      format: options.format,
      adapter,
    });
  };

  /** Append serialized detail grid rows to formData */
  const appendDetailRows = (formData: FormDataRecord): void => {
    if (!options.detailFields) return;

    formData[options.detailPropertyName] = serializeDetailRows(
      accessors.getDetailRows(),
      options.detailFields,
      getDetailIdField(),
      accessors.isEditMode(),
      adapter,
    );
  };

  /** Handle the SAVE event: validate → serialize → POST or PATCH */
  const handleSave = (): void => {
    if (!validateFn()) return;

    const { LOADING: loadingEvent, SUCCESS: successEvent } = options.events ?? {};
    if (loadingEvent) emit(loadingEvent, true);
    options.onLoadingChange?.(true);

    const rawData = accessors.getFormData();
    const formData = serializeFields(rawData);
    appendDetailRows(formData);

    const id = formData[getIdField()];

    let payload: FormDataRecord | FormData = formData;
    if (options.format === 'multipart') {
      payload = buildMultipartFormData(formData);
    }

    const finalize = () => {
      if (loadingEvent) emit(loadingEvent, false);
      options.onLoadingChange?.(false);
    };

    const request = accessors.isEditMode()
      ? options.httpClient.patch(adapter.buildItemUrl(options.url, id as string | number), payload)
      : options.httpClient.post(options.url, payload);

    request
      .then((response) => {
        if (successEvent) emit(successEvent, response);
        options.onSaveSuccess?.(response);
      })
      .catch((err: unknown) => {
        const apiError = readApiError(err);
        const violations =
          apiError?.data && typeof apiError.data === 'object'
            ? (apiError.data as Record<string, unknown>)['violations']
            : undefined;

        if (Array.isArray(violations)) {
          // Symfony validation failure — per-field messages the form already knows how to render.
          emit(options.formErrorsEvent ?? FORM_ERRORS_EVENT, violations);
        } else {
          // Any other API Platform error shape (domain exceptions, type mismatches, …) carries no
          // `violations` array and would otherwise vanish silently. Route its message through the
          // same pipeline as an "unassigned" violation so the existing toast picks it up.
          const message = extractApiErrorMessage(apiError?.data);
          if (message) {
            emit(options.formErrorsEvent ?? FORM_ERRORS_EVENT, [{ message }]);
          }
        }
        options.onSaveError?.(err);
      })
      .finally(finalize);
  };

  /** Handle the DELETE event: confirmation is handled by the DataGrid's ConfirmDialog before this fires */
  const handleDelete = (payload: DeletePayload): void => {
    const { LOADING: loadingEvent, SUCCESS: successEvent } = options.events ?? {};

    if (loadingEvent) emit(loadingEvent, true);
    options.onLoadingChange?.(true);

    const finalize = () => {
      if (loadingEvent) emit(loadingEvent, false);
      options.onLoadingChange?.(false);
    };

    options.httpClient
      .delete(adapter.buildItemUrl(options.url, payload.row[getIdField()] as string | number))
      .then((response: unknown) => {
        if (successEvent) emit(successEvent, response);
        options.onDeleteSuccess?.(response);
      })
      .catch((err: unknown) => {
        // A resource that doesn't wire its own onDeleteError previously failed
        // completely silently — the confirm dialog closed as if the delete had
        // succeeded (e.g. a DELETE rejected with 409 Conflict by a foreign-key
        // constraint). Surface the API's message by default; a resource that
        // supplies its own handler is assumed to render its own feedback.
        if (!options.onDeleteError) {
          const apiError = readApiError(err);
          const message = extractApiErrorMessage(apiError?.data);
          notify(message ?? t('form.deleteError'), 'error');
        }
        options.onDeleteError?.(err);
      })
      .finally(finalize);
  };

  return { handleSave, handleDelete, serializeFields, appendDetailRows };
};
