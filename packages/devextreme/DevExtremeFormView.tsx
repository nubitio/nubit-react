import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import Form, { SimpleItem } from 'devextreme-react/form';

import { useCoreHttpClient, useCoreTranslation, useEvents } from '@nubitio/core';
import type { CoreTranslationKeys, DataRecord } from '@nubitio/core';
import type { Field } from '@nubitio/crud';
import {
  FORM_ERRORS_EVENT,
  FORM_EVENTS,
  FileUploadField,
  type FormHandle,
  type FormViewOptions,
  useFormState,
  useFormSubmit,
  useFormValidation,
} from '@nubitio/crud';
import { FieldType } from '@nubitio/crud';
import { buildEmptyRow, normalizeFormData } from '@nubitio/crud';
import { loadDetailRows } from '@nubitio/crud';
import { mapApiViolations } from '@nubitio/crud';
import type { FormDataRecord } from '@nubitio/crud';

import { DevExtremeFormDetailGrid } from './DevExtremeFormDetailGrid';
import { mapFieldsToDxFormItems } from './mapFieldsToDxFormItems';

type EventRowPayload = FormDataRecord & { row?: FormDataRecord };

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function withDetailRowKeys(rows: FormDataRecord[]): FormDataRecord[] {
  return rows.map((row) => ({
    ...row,
    __rowKey: typeof row.__rowKey === 'string' ? row.__rowKey : crypto.randomUUID(),
  }));
}

function validateField(
  field: Field,
  value: unknown,
  formData: FormDataRecord,
  t: (key: keyof CoreTranslationKeys, options?: DataRecord) => string,
): string | null {
  if (field.required && isEmptyValue(value)) {
    return t('form.fieldRequired', { label: field.label });
  }

  for (const rule of field.validators ?? []) {
    if (rule.type === 'required' && isEmptyValue(value)) {
      return rule.options.message ?? t('form.fieldRequired', { label: field.label });
    }
    if (
      rule.type === 'email' &&
      typeof value === 'string' &&
      value !== '' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      return rule.options.message ?? t('form.invalidEmail');
    }
    if (rule.type === 'numeric' && value !== '' && value != null && Number.isNaN(Number(value))) {
      return rule.options.message ?? t('form.invalidNumeric');
    }
    if (rule.type === 'pattern' && typeof value === 'string' && !new RegExp(rule.options.pattern).test(value)) {
      return rule.options.message ?? t('form.invalidPattern');
    }
    if (rule.type === 'stringLength' && typeof value === 'string') {
      if (rule.options.min !== undefined && value.length < rule.options.min) {
        return rule.options.message ?? t('form.stringTooShort');
      }
      if (rule.options.max !== undefined && value.length > rule.options.max) {
        return rule.options.message ?? t('form.stringTooLong');
      }
    }
    if (rule.type === 'range' && value !== '' && value != null) {
      const numericValue = Number(value);
      if (rule.options.min !== undefined && numericValue < rule.options.min) {
        return rule.options.message ?? t('form.outOfRange');
      }
      if (rule.options.max !== undefined && numericValue > rule.options.max) {
        return rule.options.message ?? t('form.outOfRange');
      }
    }
    if (rule.type === 'custom') {
      const valid = rule.options.validationCallback({ value, data: formData });
      if (!valid) return rule.options.message ?? t('validation.defaultError');
    }
  }

  return null;
}

export const DevExtremeFormView = forwardRef<FormHandle, FormViewOptions>((options, ref) => {
  const { t } = useCoreTranslation();
  const httpClient = useCoreHttpClient();
  const [on, emit] = useEvents();
  const instanceId = useId();
  const scopedFormErrorsEvent = `${FORM_ERRORS_EVENT}:${instanceId}`;
  const appliedOperationRef = useRef<string | null>(null);
  const [detailDirty, setDetailDirty] = useState(false);

  const {
    accessors,
    formData,
    detailRows,
    fieldState,
    setFieldState,
    errors,
    setErrors,
    detailErrors,
    setDetailErrors,
    setNextFormData,
    setNextDetailRows,
    setFieldValue,
    setEditMode,
    resetUploadSession,
    resetPrependData,
    setExistingMedia,
    clearExistingMedia,
    upsertUploadedFile,
  } = useFormState({ fields: options.fields, onFieldDataChanged: options.onFieldDataChanged });

  const detailPropertyName = options.detailPropertyName ?? 'items';
  const formItems = useMemo(() => mapFieldsToDxFormItems(options.fields), [options.fields]);
  const detailRowsWithKeys = useMemo(() => withDetailRowKeys(detailRows), [detailRows]);

  const validateForm = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    options.fields.forEach((field) => {
      const state = fieldState[field.name];
      if (
        field.isIdentity ||
        state?.validationEnabled === false ||
        state?.hidden === true ||
        field.hidden ||
        field.visibleOnForm === false
      ) {
        return;
      }

      let value = accessors.getFieldValue(field.name);
      if (field.type === FieldType.FILE) {
        const uploaded = accessors.getUploadedFile(field.name);
        const hasExisting = accessors.getExistingMedia(field.name) !== null;
        value =
          uploaded?.iri != null || (hasExisting && uploaded === undefined) ? 'present' : null;
      }

      const error = validateField(field, value, accessors.getFormData(), t);
      if (error) nextErrors[field.name] = error;
    });
    setErrors(nextErrors);
    setDetailErrors({});
    return Object.keys(nextErrors).length === 0;
  }, [accessors, fieldState, options.fields, setDetailErrors, setErrors, t]);

  const validate = useFormValidation({
    accessors: {
      getDetailRowCount: () => accessors.getDetailRows().length,
      getDetailRows: accessors.getDetailRows,
      hasPendingDetailEdits: () => detailDirty,
      validateForm,
    },
    detailFields: options.detailFields,
    detailNoDataText: options.requiredDetail ? t('form.detailRequired') : t('form.detailEmpty'),
    requiredDetail: options.requiredDetail,
    validationErrorText: t('form.validationError'),
  });

  const { handleSave, handleDelete } = useFormSubmit(
    {
      url: options.url,
      detailUrl: options.detailUrl,
      fields: options.fields,
      detailFields: options.detailFields,
      detailPropertyName,
      format: options.format,
      events: options.events,
      formErrorsEvent: scopedFormErrorsEvent,
      httpClient,
      adapter: options.adapter,
      onSaveSuccess: options.onSaveSuccess,
      onSaveError: options.onSaveError,
      onDeleteSuccess: options.onDeleteSuccess,
      onDeleteError: options.onDeleteError,
      onLoadingChange: options.onLoadingChange,
    },
    accessors,
    emit,
    validate,
  );

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const handleDeleteRef = useRef(handleDelete);
  handleDeleteRef.current = handleDelete;

  const captureExistingMedia = useCallback(
    (row: FormDataRecord) => {
      const nextMedia: Record<string, FormDataRecord> = {};
      options.fields.forEach((field) => {
        if (field.type !== FieldType.FILE) return;
        const raw = row[field.name];
        if (raw && typeof raw === 'object') {
          nextMedia[field.name] = raw as FormDataRecord;
        }
      });
      setExistingMedia(nextMedia);
    },
    [options.fields, setExistingMedia],
  );

  const applyAddPayload = useCallback(
    (payload: EventRowPayload | undefined) => {
      resetUploadSession();
      setExistingMedia({});
      setErrors({});
      setDetailErrors({});
      setNextDetailRows([]);
      setDetailDirty(false);
      resetPrependData();
      const row = payload
        ? normalizeFormData(payload, options.fields, options.adapter, accessors.getPrependDataMap())
        : buildEmptyRow(options.fields);
      setNextFormData(row);
      setEditMode(false);
    },
    [
      accessors,
      options.adapter,
      options.fields,
      resetPrependData,
      resetUploadSession,
      setDetailErrors,
      setEditMode,
      setErrors,
      setExistingMedia,
      setNextDetailRows,
      setNextFormData,
    ],
  );

  const applyEditPayload = useCallback(
    (payload: { row: FormDataRecord }) => {
      resetPrependData();
      captureExistingMedia(payload.row);
      const row = normalizeFormData(payload.row, options.fields, options.adapter, accessors.getPrependDataMap());
      resetUploadSession();
      setErrors({});
      setDetailErrors({});
      setNextFormData(row);
      setEditMode(true);
      setDetailDirty(false);

      const idField = options.fields.find((field) => field.isIdentity)?.name ?? '';
      const detailId = row[idField];
      const detailUrl =
        typeof detailId === 'string' || typeof detailId === 'number'
          ? options.detailUrl?.replace('{id}', String(detailId))
          : undefined;
      if (!detailUrl) return;

      emit(FORM_EVENTS.LOADING, true);
      loadDetailRows(httpClient, detailUrl, options.adapter)
        .then((rows) => setNextDetailRows(withDetailRowKeys(rows)))
        .finally(() => emit(FORM_EVENTS.LOADING, false));
    },
    [
      accessors,
      captureExistingMedia,
      emit,
      httpClient,
      options.adapter,
      options.detailUrl,
      options.fields,
      resetPrependData,
      resetUploadSession,
      setDetailErrors,
      setEditMode,
      setErrors,
      setNextDetailRows,
      setNextFormData,
    ],
  );

  useEffect(() => {
    if (!options.operation) {
      appliedOperationRef.current = null;
      return;
    }
    const operationKey = `${options.operation}:${options.operationVersion ?? 0}`;
    if (appliedOperationRef.current === operationKey) return;
    appliedOperationRef.current = operationKey;

    if (options.operation === 'add') {
      applyAddPayload(options.rowData ?? undefined);
      return;
    }
    if (options.operation === 'edit' && options.rowData) {
      applyEditPayload({ row: options.rowData });
    }
  }, [applyAddPayload, applyEditPayload, options.operation, options.operationVersion, options.rowData]);

  useEffect(() => {
    const subs = [
      on<unknown>(scopedFormErrorsEvent, (formErrors) => {
        const mapped = mapApiViolations(formErrors, detailPropertyName, t('validation.defaultError'));
        setErrors((current) => ({ ...current, ...mapped.fieldErrors }));
        setDetailErrors(mapped.detailErrors);
      }),
    ];

    if (options.events?.ADD) {
      subs.push(on(options.events.ADD, (payload: EventRowPayload | undefined) => applyAddPayload(payload)));
    }
    if (options.events?.EDIT) {
      subs.push(on(options.events.EDIT, (payload: { row: FormDataRecord }) => applyEditPayload(payload)));
    }
    if (options.events?.DELETE) {
      subs.push(on(options.events.DELETE, (payload: { row: FormDataRecord }) => handleDeleteRef.current(payload)));
    }
    if (options.events?.SAVE) {
      subs.push(on(options.events.SAVE, () => handleSaveRef.current()));
    }

    return () => subs.forEach((sub) => sub.unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedFormErrorsEvent]);

  const handleDetailRowsChange = useCallback(
    (rows: FormDataRecord[]) => {
      const normalized = withDetailRowKeys(rows).map(({ __rowKey, ...row }) => row);
      setNextDetailRows(normalized);
      setDetailDirty(true);
    },
    [setNextDetailRows],
  );

  useImperativeHandle(
    ref,
    () => ({
      getFormData: accessors.getFormData,
      getFieldValue: accessors.getFieldValue,
      setFieldValue,
      getDetailData: accessors.getDetailRows,
      setDetailData: (data) => setNextDetailRows(data),
      saveDetailData: () => undefined,
      reloadDetailData: () => undefined,
      setValues: (data) => {
        resetPrependData();
        setNextFormData(normalizeFormData(data, options.fields, undefined, accessors.getPrependDataMap()));
      },
      save: () => handleSaveRef.current(),
      deleteRow: (row) => handleDeleteRef.current({ row }),
      setReadonly: (field, value) =>
        setFieldState((current) => ({ ...current, [field]: { ...current[field], readonly: value } })),
      setDisabled: (field, value) =>
        setFieldState((current) => ({ ...current, [field]: { ...current[field], disabled: value } })),
      enableValidation: (field) =>
        setFieldState((current) => ({ ...current, [field]: { ...current[field], validationEnabled: true } })),
      disableValidation: (field) =>
        setFieldState((current) => ({ ...current, [field]: { ...current[field], validationEnabled: false } })),
      setError: (field, message) => setErrors((current) => ({ ...current, [field]: message })),
      showField: (field) =>
        setFieldState((current) => ({ ...current, [field]: { ...current[field], hidden: false } })),
      hideField: (field) =>
        setFieldState((current) => ({ ...current, [field]: { ...current[field], hidden: true } })),
      validate,
      setIsEdit: (value) => setEditMode(value),
    }),
    [
      accessors,
      options.fields,
      resetPrependData,
      setEditMode,
      setErrors,
      setFieldState,
      setFieldValue,
      setNextDetailRows,
      setNextFormData,
      validate,
    ],
  );

  const fileFields = options.fields.filter(
    (field) =>
      field.type === FieldType.FILE &&
      field.visibleOnForm &&
      !field.hidden &&
      !fieldState[field.name]?.hidden,
  );

  const visibleItems = formItems.filter((item) => {
    const state = fieldState[item.dataField] ?? {};
    const field = options.fields.find((candidate) => candidate.name === item.dataField);
    return !state.hidden && field?.type !== FieldType.FILE && field?.type !== FieldType.HTML;
  });

  return (
    <div className={options.className ?? 'nb-dx-form'}>
      <Form
        formData={formData}
        colCount={2}
        labelLocation="top"
        readOnly={options.editable === false}
        onFieldDataChanged={(event) => {
          if (!event.dataField) return;
          setFieldValue(event.dataField, event.value);
        }}
      >
        {visibleItems.map((item) => (
          <SimpleItem
            key={item.dataField}
            dataField={item.dataField}
            label={item.label}
            editorType={item.editorType}
            editorOptions={{
              ...item.editorOptions,
              readOnly:
                fieldState[item.dataField]?.readonly ??
                options.fields.find((field) => field.name === item.dataField)?.readonly ??
                options.editable === false,
              disabled:
                fieldState[item.dataField]?.disabled ??
                options.fields.find((field) => field.name === item.dataField)?.disabled,
            }}
            colSpan={item.colSpan}
            isRequired={item.isRequired}
            helpText={item.helpText}
            validationError={errors[item.dataField]}
          />
        ))}
      </Form>

      {fileFields.map((field) => (
        <div key={field.name} className="nb-dx-form__file-field">
          <label className="nb-dx-form__file-label">{field.label}</label>
          <FileUploadField
            field={field}
            existingMedia={accessors.getExistingMedia(field.name)}
            disabled={fieldState[field.name]?.disabled ?? field.disabled ?? options.editable === false}
            readOnly={fieldState[field.name]?.readonly ?? field.readonly ?? options.editable === false}
            invalid={!!errors[field.name]}
            uploadUrl={field.url ?? `${options.url}/upload`}
            httpClient={httpClient}
            t={t}
            onUploaded={(entry) => upsertUploadedFile(entry)}
            onCleared={(fieldName) => clearExistingMedia(fieldName)}
          />
          {errors[field.name] ? <span className="nb-dx-form__error">{errors[field.name]}</span> : null}
        </div>
      ))}

      {options.detailFields?.length ? (
        <DevExtremeFormDetailGrid
          fields={options.detailFields}
          rows={detailRowsWithKeys}
          allowAdding={options.allowAdding}
          allowUpdating={options.allowUpdating}
          allowDeleting={options.allowDeleting}
          detailErrors={detailErrors}
          onRowsChange={handleDetailRowsChange}
        />
      ) : null}
    </div>
  );
});

DevExtremeFormView.displayName = 'DevExtremeFormView';