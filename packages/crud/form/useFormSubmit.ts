import { serializeFormFields, serializeDetailRows } from './serializeFormData';
import type { UseFormSubmitAccessors } from './FormSubmitAccessors';
import type { UseFormSubmitOptions } from './FormSubmitOptions';
import { useCoreRuntime, useCoreTranslation } from '@nubit/core';
import type { FormDataRecord } from './FormDataSnapshot';
import { FORM_ERRORS_EVENT } from './FormEvents';
import { HydraAdapter } from '../adapter/HydraAdapter';

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
  const { confirm } = useCoreRuntime();

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
        if (
          typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          err.status === 422 &&
          'data' in err &&
          typeof err.data === 'object' &&
          err.data !== null &&
          'violations' in err.data
        ) {
          emit(options.formErrorsEvent ?? FORM_ERRORS_EVENT, err.data.violations);
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
        options.onDeleteError?.(err);
      })
      .finally(finalize);
  };

  return { handleSave, handleDelete, serializeFields, appendDetailRows };
};
