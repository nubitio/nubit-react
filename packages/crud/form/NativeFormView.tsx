import './NativeFormView.scss';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { IconButton } from '@nubitio/ui';

import { useCoreHttpClient, useCoreRuntime, useEvents, useCoreTranslation, type CoreHttpClient, type CoreTranslationKeys } from '@nubitio/core';
import { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
import type { DataRecord } from '@nubitio/core';
import { useResourceStoreFactory } from '../data/ResourceStore';
import { FORM_ERRORS_EVENT, FORM_EVENTS } from './FormEvents';
import { buildEmptyRow, normalizeFormData, type PrependDataMap } from './FormDataTransform';
import { safeRandomId } from './safeRandomId';
import { buildFormLayoutModel, type FormLayoutGroup, type FormLayoutModel } from './FormLayoutModel';
import {
  buildFieldColSpanContext,
  resolveFieldsColSpans,
  type ColSpan,
  type FieldColSpanContext,
} from './resolveFieldColSpan';
import type { FormDataRecord } from './FormDataSnapshot';
import type { FormHandle } from './FormHandle';
import type { FormViewOptions } from './FormViewOptions';
import { useFormSubmit } from './useFormSubmit';
import { useFormValidation } from './useFormValidation';
import { type DetailFieldErrors, mapApiViolations } from './FormApiViolations';
import { resolveSummaryText, type DetailSummaryOptions } from '../summary';
import { createRemoteSource, fieldKeyValue } from './fieldOptionSource';
import { getFieldTypeModule } from '../field/registry/registry';
import type { DetailCellProps, FormControlContext } from '../field/registry/FieldTypeModule';
import { renderDefaultDetailCell } from '../field/registry/controlHelpers';
import { useFormState } from './useFormState';

type EventRowPayload = FormDataRecord & { row?: FormDataRecord };

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function colSpanStyle(span: ColSpan): React.CSSProperties {
  return { '--nb-form-col': String(span) } as React.CSSProperties;
}

function useViewportWidth(): number | undefined {
  const [width, setWidth] = useState<number | undefined>(() =>
    typeof window !== 'undefined' ? window.innerWidth : undefined,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
}

function resolveTabIcon(icon?: string): string | undefined {
  if (!icon) return undefined;
  if (icon.startsWith('ph ')) return icon;
  if (icon.startsWith('ph-')) return `ph ${icon}`;
  return `ph ph-${icon}`;
}


type Translator = (key: keyof CoreTranslationKeys, options?: DataRecord) => string;

function validateField(field: Field, value: unknown, formData: FormDataRecord, t: Translator): string | null {
  if (field.required && isEmptyValue(value)) return t('form.fieldRequired', { label: field.label });

  for (const rule of field.validators ?? []) {
    if (rule.type === 'required' && isEmptyValue(value)) return rule.options.message ?? t('form.fieldRequired', { label: field.label });
    if (rule.type === 'email' && typeof value === 'string' && value !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return rule.options.message ?? t('form.invalidEmail');
    }
    if (rule.type === 'numeric' && value !== '' && value != null && Number.isNaN(Number(value))) {
      return rule.options.message ?? t('form.invalidNumeric');
    }
    if (rule.type === 'pattern' && typeof value === 'string' && !new RegExp(rule.options.pattern).test(value)) {
      return rule.options.message ?? t('form.invalidPattern');
    }
    if (rule.type === 'stringLength' && typeof value === 'string') {
      if (rule.options.min !== undefined && value.length < rule.options.min) return rule.options.message ?? t('form.stringTooShort');
      if (rule.options.max !== undefined && value.length > rule.options.max) return rule.options.message ?? t('form.stringTooLong');
    }
    if (rule.type === 'range' && value !== '' && value != null) {
      const numericValue = Number(value);
      if (rule.options.min !== undefined && numericValue < rule.options.min) return rule.options.message ?? t('form.outOfRange');
      if (rule.options.max !== undefined && numericValue > rule.options.max) return rule.options.message ?? t('form.outOfRange');
    }
    if (rule.type === 'compare') {
      const target = rule.options.comparisonTarget();
      const comparison = rule.options.comparisonType ?? '==';
      const valid =
        comparison === '==' ? value === target :
        comparison === '!=' ? value !== target :
        comparison === '>' ? Number(value) > Number(target) :
        comparison === '<' ? Number(value) < Number(target) :
        comparison === '>=' ? Number(value) >= Number(target) :
        Number(value) <= Number(target);
      if (!valid) return rule.options.message ?? t('validation.defaultError');
    }
    if (rule.type === 'custom' && !rule.options.validationCallback({ value, data: formData })) {
      return rule.options.message ?? t('validation.defaultError');
    }
  }

  return null;
}

const DETAIL_CURRENCY_COL_WIDTH = 112;
const DETAIL_NUMBER_COL_WIDTH = 96;

function resolveDetailColWidth(field: Field, colWidths: Record<string, number>): number | undefined {
  if (colWidths[field.name] !== undefined) return colWidths[field.name];
  if (field.width !== undefined) {
    const parsed = typeof field.width === 'number' ? field.width : Number.parseInt(String(field.width), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (field.type === FieldType.CURRENCY) return DETAIL_CURRENCY_COL_WIDTH;
  if (field.type === FieldType.NUMBER) return DETAIL_NUMBER_COL_WIDTH;
  return undefined;
}

function DetailColumnGroup({
  allowDeleting,
  fields,
  colWidths,
}: {
  allowDeleting?: boolean;
  fields: Field[];
  colWidths: Record<string, number>;
}) {
  return (
    <colgroup>
      {fields.map((field) => {
        const width = resolveDetailColWidth(field, colWidths);
        return <col key={field.name} style={width ? { width } : undefined} />;
      })}
      {allowDeleting && <col className="nb-form__col-actions-col" />}
    </colgroup>
  );
}

function DetailSummaryFooter({
  allowDeleting,
  colWidths,
  fields,
  rows,
  scrollRef,
  summary,
}: {
  allowDeleting?: boolean;
  colWidths: Record<string, number>;
  fields: Field[];
  rows: FormDataRecord[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  summary?: DetailSummaryOptions;
}) {
  if (!summary?.items.length || summary.visible === false) return null;

  const itemsByColumn = new Map(summary.items.filter((item) => item.column).map((item) => [item.column, item]));

  return (
    <div ref={scrollRef} className="nb-form__detail-summary-wrap">
      <table className="nb-form__detail-table nb-form__detail-summary-table">
        <DetailColumnGroup allowDeleting={allowDeleting} colWidths={colWidths} fields={fields} />
        <tbody className="nb-form__detail-summary">
          <tr>
            {fields.map((field) => {
              const item = itemsByColumn.get(field.name);
              const align = item?.align ?? field.align;
              const alignItems =
                align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
              return (
                <td key={field.name} style={align ? { textAlign: align } : undefined}>
                  {item && (
                    <div className="nb-form__detail-summary-cell" style={{ alignItems }}>
                      {item.label && <span className="nb-form__detail-summary-label">{item.label}</span>}
                      <span className="nb-form__detail-summary-value">{resolveSummaryText(rows, item)}</span>
                    </div>
                  )}
                </td>
              );
            })}
            {allowDeleting && <td className="nb-form__col-actions" />}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function NativeDetailGrid({
  allowAdding = true,
  allowDeleting = true,
  allowUpdating = true,
  detailFields,
  httpClient,
  detailErrors = {},
  onClearCellError,
  onRowsChange,
  onRowsMutated,
  prependData,
  remoteOptions,
  rows,
  summary,
}: {
  allowAdding?: boolean;
  allowDeleting?: boolean;
  allowUpdating?: boolean;
  detailFields: Field[];
  httpClient: CoreHttpClient;
  detailErrors?: DetailFieldErrors;
  onClearCellError?: (rowIndex: number, fieldName: string) => void;
  onRowsChange: (rows: FormDataRecord[]) => void;
  onRowsMutated: () => void;
  prependData?: PrependDataMap;
  remoteOptions: Record<string, DataRecord[]>;
  rows: FormDataRecord[];
  summary?: DetailSummaryOptions;
}) {
  const { t } = useCoreTranslation();
  const visibleFields = detailFields.filter((field) => field.visible && !field.hidden);
  const rowKeysRef = useRef<string[]>(rows.map(() => safeRandomId()));
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const summaryWrapRef = useRef<HTMLDivElement>(null);

  // Re-generate keys when the parent resets rows to a different-length array
  // (e.g. switching between edit records). addRow/removeRow keep rowKeysRef
  // in sync before their onRowsChange fires, so this guard only triggers on a
  // true external reset. Reading/writing the ref here is intentional.
  // eslint-disable-next-line react-hooks/refs
  if (rowKeysRef.current.length !== rows.length) {
    rowKeysRef.current = rows.map(() => safeRandomId()); // eslint-disable-line react-hooks/refs
  }

  // ── Column resize ────────────────────────────────────────────────────────────
  // Tracks user-overridden column widths. Falls back to field.width when not set.
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ name: string; startX: number; startWidth: number } | null>(null);

  const handleResizeMouseDown = (fieldName: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest('th') as HTMLTableCellElement | null;
    if (!th) return;
    resizingRef.current = { name: fieldName, startX: e.clientX, startWidth: th.offsetWidth };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const next = Math.max(36, resizingRef.current.startWidth + (ev.clientX - resizingRef.current.startX));
      setColWidths((prev) => ({ ...prev, [resizingRef.current!.name]: next })); // eslint-disable-line react-hooks/refs
    };
    const onMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useLayoutEffect(() => {
    const tableScroll = tableScrollRef.current;
    const summaryWrap = summaryWrapRef.current;
    if (!tableScroll || !summaryWrap) return;

    const syncSummaryScroll = () => {
      summaryWrap.scrollLeft = tableScroll.scrollLeft;
    };

    syncSummaryScroll();
    tableScroll.addEventListener('scroll', syncSummaryScroll, { passive: true });
    return () => tableScroll.removeEventListener('scroll', syncSummaryScroll);
  }, [colWidths]);

  const updateCell = async (rowIndex: number, field: Field, value: unknown) => {
    onClearCellError?.(rowIndex, field.name);
    let nextRow = { ...rows[rowIndex], [field.name]: value };
    if (field.onChange) {
      const draft = { ...rows[rowIndex] };
      const fieldContext = {
        defaultSetCellValue: (row: FormDataRecord, nextValue: unknown) => {
          row[field.name] = nextValue;
        },
      };
      await (field.onChange as (...args: unknown[]) => void | Promise<void>).call(fieldContext, draft, value, rows[rowIndex]);
      nextRow = { ...nextRow, ...draft };
    }
    const nextRows = rows.map((row, index) => index === rowIndex ? nextRow : row);
    onRowsChange(nextRows);
    onRowsMutated();
  };

  const addRow = () => {
    rowKeysRef.current.push(safeRandomId());
    onRowsChange([...rows, buildEmptyRow(detailFields)]);
    onRowsMutated();
  };

  const removeRow = (rowIndex: number) => {
    rowKeysRef.current.splice(rowIndex, 1);
    onRowsChange(rows.filter((_, index) => index !== rowIndex));
    onRowsMutated();
  };

  const renderDetailControl = (row: FormDataRecord, rowIndex: number, field: Field) => {
    const value = row[field.name];
    const error = detailErrors[rowIndex]?.[field.name];
    const errorClass = error ? ' is-error' : '';
    if (field.formatter && field.type === FieldType.NONE) {
      return field.formatter({ value, data: row, rowIndex, columnIndex: 0 });
    }
    const typeModule = getFieldTypeModule(field.type);
    const cell: DetailCellProps = {
      field,
      value,
      errorClass,
      allowUpdating,
      httpClient,
      remoteOptions,
      getPrependData: (name) => prependData?.get(name),
      onChange: (nextValue) => void updateCell(rowIndex, field, nextValue),
    };
    return typeModule.DetailCellRender
      ? typeModule.DetailCellRender(cell)
      : renderDefaultDetailCell(cell);
  };


  return (
    <div className="nb-form__detail">
      <div className="nb-form__detail-heading">
        <h3 className="nb-form__detail-title">{t('form.detailTitle')}</h3>
        {allowAdding && (
          <IconButton icon="ph ph-plus" label={t('form.detailAdd')} onClick={addRow} />
        )}
      </div>
      <div className="nb-form__detail-table-wrap">
        <div ref={tableScrollRef} className="nb-form__detail-table-scroll">
          <table className="nb-form__detail-table">
            <DetailColumnGroup allowDeleting={allowDeleting} colWidths={colWidths} fields={visibleFields} />
            <thead>
              <tr>
                {visibleFields.map((field) => (
                    <th
                      key={field.name}
                      style={field.align ? { textAlign: field.align } : undefined}
                    >
                      <span className="nb-form__col-header-text">{field.label}</span>
                      <span
                        className="nb-form__col-resize"
                        onMouseDown={handleResizeMouseDown(field.name)}
                        title={t('grid.resizeColumn')}
                      />
                    </th>
                ))}
                {allowDeleting && <th className="nb-form__col-actions" />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={visibleFields.length + (allowDeleting ? 1 : 0)} className="nb-form__detail-empty">
                    <i className="ph ph-package nb-form__detail-empty-icon" aria-hidden="true" />
                    <span className="nb-form__detail-empty-text">{t('form.detailEmpty')}</span>
                    {allowAdding && (
                      <span className="nb-form__detail-empty-hint">{t('form.detailEmptyHint')}</span>
                    )}
                  </td>
                </tr>
              )}
              {/* eslint-disable react-hooks/refs -- rowKeysRef is updated synchronously by addRow/removeRow before onRowsChange fires, so it is always in sync with rows here */}
              {rows.map((row, rowIndex) => {
                const rowKey = rowKeysRef.current[rowIndex]; // eslint-disable-line react-hooks/refs
                return (
                <tr key={rowKey}>
                  {visibleFields.map((field) => (
                    <td key={field.name} style={field.align ? { textAlign: field.align } : undefined}>
                      {renderDetailControl(row, rowIndex, field)}
                      {detailErrors[rowIndex]?.[field.name] && <span className="nb-form__error"><i className="ph ph-warning-circle" aria-hidden="true" />{detailErrors[rowIndex][field.name]}</span>}
                    </td>
                  ))}
                  {allowDeleting && (
                    <td className="nb-form__col-actions">
                      <IconButton icon="ph ph-trash" label={t('form.detailRemove')} onClick={() => removeRow(rowIndex)} />
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <DetailSummaryFooter
          allowDeleting={allowDeleting}
          colWidths={colWidths}
          fields={visibleFields}
          rows={rows}
          scrollRef={summaryWrapRef}
          summary={summary}
        />
      </div>
    </div>
  );
}

export const NativeFormView = forwardRef<FormHandle, FormViewOptions>((options, ref) => {
  const { t } = useCoreTranslation();
  const { notify } = useCoreRuntime();
  const httpClient = useCoreHttpClient();
  const resourceStoreFactory = useResourceStoreFactory();
  const [on, emit] = useEvents();
  const instanceId = useId();
  const scopedFormErrorsEvent = `${FORM_ERRORS_EVENT}:${instanceId}`;
  const {
    isEdit,
    uploadedFiles,
    existingMediaByField,
    upsertUploadedFile,
    formData,
    formDataRef,
    detailRows,
    detailRowsRef,
    fieldState,
    setFieldState,
    errors,
    setErrors,
    detailErrors,
    setDetailErrors,
    prependDataRef,
    setNextFormData,
    setNextDetailRows,
    setFieldValue,
    clearDetailCellError,
    setEditMode,
    resetUploadSession,
    setExistingMedia,
    clearExistingMedia,
    resetPrependData,
  } = useFormState({ fields: options.fields, onFieldDataChanged: options.onFieldDataChanged });

  const [remoteOptions, setRemoteOptions] = useState<Record<string, DataRecord[]>>({});
  const [activeTab, setActiveTab] = useState(0);
  const appliedOperationRef = useRef<string | null>(null);

  const fields = options.fields;
  const detailPropertyName = options.detailPropertyName ?? 'items';
  const computedFieldNames = useMemo(() => fields.filter((field) => field.computed !== undefined).map((field) => field.name), [fields]);
  const viewportWidth = useViewportWidth();
  const formLayoutModel = useMemo(() => buildFormLayoutModel(fields, options.formLayout, t('form.groupOther')), [fields, options.formLayout, t]);
  const optionFields = useMemo(() => [...fields, ...(options.detailFields ?? [])], [fields, options.detailFields]);
  const baseColSpanContext = useMemo<FieldColSpanContext>(() => buildFieldColSpanContext({
    presentationMode: options.presentationContext?.presentationMode ?? 'dialog',
    drawerWidth: options.presentationContext?.drawerWidth,
    dialogWidth: options.presentationContext?.dialogWidth,
    viewportWidth: options.presentationContext?.viewportWidth ?? viewportWidth,
    containerWidth: options.presentationContext?.containerWidth,
    hasTabs: options.presentationContext?.hasTabs ?? formLayoutModel.type === 'tabs',
    hasMasterDetail: options.presentationContext?.hasMasterDetail ?? !!options.detailFields,
  }), [
    formLayoutModel.type,
    options.detailFields,
    options.presentationContext,
    viewportWidth,
  ]);

  const notifyDetailRowsMutated = useCallback(() => {
    emit(FORM_EVENTS.ROW_UPDATED, detailRowsRef.current);
  }, [detailRowsRef, emit]);

  useEffect(() => {
    optionFields.forEach((field) => {
      if (field.type !== FieldType.ENTITY && field.type !== FieldType.TAGS) return;
      if (!field.url) {
        setRemoteOptions((current) => ({ ...current, [field.name]: field.data ?? [] }));
        return;
      }
      const source = createRemoteSource(field, httpClient, resourceStoreFactory, prependDataRef.current.get(field.name));
      source
        .load({ take: 50 })
        .then((result) => {
          setRemoteOptions((current) => ({ ...current, [field.name]: result.data }));
          if (field.autoSelectIfSingle && result.data.length === 1 && isEmptyValue(formDataRef.current[field.name])) {
            setFieldValue(field.name, fieldKeyValue(field, result.data[0]));
          }
        })
        .catch(() => {
          setRemoteOptions((current) => ({ ...current, [field.name]: field.data ?? [] }));
        });
    });
  }, [formDataRef, httpClient, optionFields, prependDataRef, resourceStoreFactory, setFieldValue]);

  useEffect(() => {
    fields.forEach((field) => {
      const optionsForField = remoteOptions[field.name];
      if (!field.autoSelectIfSingle || optionsForField?.length !== 1 || !isEmptyValue(formDataRef.current[field.name])) return;
      setFieldValue(field.name, fieldKeyValue(field, optionsForField[0]));
    });
  }, [fields, formData, formDataRef, remoteOptions, setFieldValue]);

  const validateForm = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    options.fields.forEach((field) => {
      const state = fieldState[field.name];
      if (field.isIdentity || state?.validationEnabled === false || state?.hidden === true || field.hidden || field.visibleOnForm === false) return;

      let value = formDataRef.current[field.name];
      if (field.type === FieldType.FILE) {
        const uploaded = uploadedFiles.current.find((file) => file.name === field.name);
        const hasExisting = !!existingMediaByField.current[field.name];
        value = uploaded?.iri != null || (hasExisting && uploaded === undefined)
          ? 'present'
          : null;
      }

      const error = validateField(field, value, formDataRef.current, t);
      if (error) nextErrors[field.name] = error;
    });
    setErrors(nextErrors);
    setDetailErrors({});
    return Object.keys(nextErrors).length === 0;
  }, [existingMediaByField, fieldState, formDataRef, options.fields, setDetailErrors, setErrors, t, uploadedFiles]);

  const validate = useFormValidation({
    accessors: {
      getDetailRowCount: () => detailRowsRef.current.length,
      getDetailRows: () => detailRowsRef.current,
      hasPendingDetailEdits: () => false,
      validateForm,
    },
    detailFields: options.detailFields,
    detailNoDataText: options.requiredDetail ? t('form.detailRequired') : t('form.detailEmpty'),
    requiredDetail: options.requiredDetail,
    validationErrorText: t('form.validationError'),
  });

  const submitAccessors = useMemo(() => ({
    getDetailRows: () => detailRowsRef.current,
    getFieldValue: (field: string) => formDataRef.current[field],
    getFormData: () => formDataRef.current,
    getUploadedFiles: () => uploadedFiles.current,
    isEditMode: () => isEdit.current,
  }), [detailRowsRef, formDataRef, isEdit, uploadedFiles]);

  const { handleSave, handleDelete } = useFormSubmit({
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
  }, submitAccessors, emit, validate);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const handleDeleteRef = useRef(handleDelete);
  handleDeleteRef.current = handleDelete;

  const captureExistingMedia = useCallback((row: FormDataRecord) => {
    const nextMedia: Record<string, FormDataRecord> = {};
    options.fields.forEach((field) => {
      if (field.type !== FieldType.FILE) return;
      const raw = row[field.name];
      if (raw && typeof raw === 'object') {
        nextMedia[field.name] = raw as FormDataRecord;
      }
    });
    setExistingMedia(nextMedia);
  }, [options.fields, setExistingMedia]);

  const applyAddPayload = useCallback((payload: EventRowPayload | undefined) => {
    resetUploadSession();
    setExistingMedia({});
    setErrors({});
    setDetailErrors({});
    setNextDetailRows([]);
    resetPrependData();
    const row = payload ? normalizeFormData(payload, options.fields, options.adapter, prependDataRef.current) : buildEmptyRow(options.fields);
    setNextFormData(row);
    options.fields.forEach((field) => {
      const value = row[field.name];
      if (value !== undefined) {
        void (field.onChange as ((value: unknown) => void | Promise<void>) | undefined)?.(value);
      }
    });
    if (payload && Array.isArray(payload[detailPropertyName])) {
      setNextDetailRows(payload[detailPropertyName] as FormDataRecord[]);
    }
    setEditMode(false);
  }, [detailPropertyName, options.adapter, options.fields, prependDataRef, resetPrependData, resetUploadSession, setEditMode, setErrors, setExistingMedia, setDetailErrors, setNextDetailRows, setNextFormData]);

  const applyEditPayload = useCallback((payload: { row: FormDataRecord }) => {
    resetPrependData();
    captureExistingMedia(payload.row);
    const row = normalizeFormData(payload.row, options.fields, options.adapter, prependDataRef.current);
    resetUploadSession();
    setErrors({});
    setDetailErrors({});
    setNextFormData(row);
    setEditMode(true);

    const idField = options.fields.find((field) => field.isIdentity)?.name ?? '';
    const detailId = row[idField];
    const detailUrl = typeof detailId === 'string' || typeof detailId === 'number' ? options.detailUrl?.replace('{id}', String(detailId)) : undefined;
    if (!detailUrl) return;

    emit(FORM_EVENTS.LOADING, true);
    httpClient
      .get<FormDataRecord[]>(detailUrl)
      .then((response) => setNextDetailRows(response.data))
      .finally(() => emit(FORM_EVENTS.LOADING, false));
  }, [captureExistingMedia, emit, httpClient, options.adapter, options.detailUrl, options.fields, prependDataRef, resetPrependData, resetUploadSession, setDetailErrors, setEditMode, setErrors, setNextDetailRows, setNextFormData]);

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
        notify(t('form.validationError'), 'error');
        setErrors((current) => {
          return { ...current, ...mapped.fieldErrors };
        });
        setDetailErrors(mapped.detailErrors);
      }),
    ];

    if (options.events?.ADD) subs.push(on(options.events.ADD, (payload: EventRowPayload | undefined) => applyAddPayload(payload)));
    if (options.events?.EDIT) {
      subs.push(on(options.events.EDIT, (payload: { row: FormDataRecord }) => applyEditPayload(payload)));
    }
    if (options.events?.DELETE) subs.push(on(options.events.DELETE, (payload: { row: FormDataRecord }) => handleDeleteRef.current(payload)));
    if (options.events?.SAVE) subs.push(on(options.events.SAVE, () => handleSaveRef.current()));

    return () => subs.forEach((sub) => sub.unsubscribe());
    // scopedFormErrorsEvent is stable (from useId); all other values here are either stable
    // or accessed through refs, so a single mount subscription is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedFormErrorsEvent]);

  useEffect(() => {
    if (computedFieldNames.length === 0 || !options.computedValues) return;
    let changed = false;
    const nextData = { ...formDataRef.current };
    computedFieldNames.forEach((name) => {
      if (Object.prototype.hasOwnProperty.call(options.computedValues, name) && nextData[name] !== options.computedValues?.[name]) {
        nextData[name] = options.computedValues?.[name];
        changed = true;
      }
    });
    if (changed) setNextFormData(nextData);
  }, [computedFieldNames, formDataRef, options.computedValues, setNextFormData]);

  useImperativeHandle(ref, () => ({
    getFormData: () => formDataRef.current,
    getFieldValue: (name) => formDataRef.current[name],
    setFieldValue,
    getDetailData: () => detailRowsRef.current,
    setDetailData: setNextDetailRows,
    saveDetailData: () => undefined,
    reloadDetailData: () => undefined,
    setValues: (data) => {
      resetPrependData();
      setNextFormData(normalizeFormData(data, options.fields, undefined, prependDataRef.current));
    },
    save: () => handleSaveRef.current(),
    deleteRow: (row) => handleDeleteRef.current({ row }),
    setReadonly: (field, value) => setFieldState((current) => ({ ...current, [field]: { ...current[field], readonly: value } })),
    setDisabled: (field, value) => setFieldState((current) => ({ ...current, [field]: { ...current[field], disabled: value } })),
    enableValidation: (field) => setFieldState((current) => ({ ...current, [field]: { ...current[field], validationEnabled: true } })),
    disableValidation: (field) => setFieldState((current) => ({ ...current, [field]: { ...current[field], validationEnabled: false } })),
    setError: (field, message) => setErrors((current) => ({ ...current, [field]: message })),
    showField: (field) => setFieldState((current) => ({ ...current, [field]: { ...current[field], hidden: false } })),
    hideField: (field) => setFieldState((current) => ({ ...current, [field]: { ...current[field], hidden: true } })),
    validate,
    setIsEdit: (value) => setEditMode(value),
  }), [detailRowsRef, formDataRef, options.fields, prependDataRef, resetPrependData, setEditMode, setErrors, setFieldState, setFieldValue, setNextDetailRows, setNextFormData, validate]);

  const controlContext: FormControlContext = {
    httpClient,
    t,
    remoteOptions,
    getPrependData: (name) => prependDataRef.current.get(name),
    getFieldValue: (name) => formDataRef.current[name],
    getExistingMedia: (name) => existingMediaByField.current[name] ?? null,
    clearExistingMedia,
    upsertUploadedFile,
  };

  const renderField = (field: Field, span: ColSpan) => {
    const state = fieldState[field.name] ?? {};
    if (field.isIdentity || !field.visibleOnForm || field.hidden || state.hidden) return null;
    const value = formData[field.name];
    const readOnly = state.readonly ?? field.readonly ?? options.editable === false;
    const disabled = state.disabled ?? field.disabled;
    const error = errors[field.name];
    const errorClass = error ? ' is-error' : '';
    const actionClass = field.onClick ? ' nb-form__control--action' : '';
    const commonProps = {
      className: `nb-form__control${actionClass}${errorClass}`,
      disabled,
      id: `nb-form-${field.name}`,
      name: field.name,
      onClick: field.onClick,
      readOnly,
      required: field.required,
    };

    const typeModule = getFieldTypeModule(field.type);
    let control: React.ReactNode;
    if (field.contentRender && typeof field.contentRender === 'function') {
      control = field.contentRender({ data: formData, value });
    } else {
      control = typeModule.ControlRender({
        field,
        value,
        error,
        errorClass,
        disabled,
        readOnly,
        commonProps,
        setFieldValue,
        ctx: controlContext,
      });
    }

    return (
      <div key={field.name} className="nb-form__field" style={colSpanStyle(span)}>
        {!typeModule.rendersOwnLabel && <label className={`nb-form__label${field.required ? ' nb-form__label--required' : ''}`} htmlFor={`nb-form-${field.name}`}>{field.label}</label>}
        {control}
        {field.helpText && <span className="nb-form__hint">{field.helpText}</span>}
        {error && <span className="nb-form__error"><i className="ph ph-warning-circle" aria-hidden="true" />{error}</span>}
      </div>
    );
  };

  const renderFields = (visibleFields: Field[], layoutContext?: Partial<FieldColSpanContext>) => {
    const spans = resolveFieldsColSpans(visibleFields, {
      ...baseColSpanContext,
      ...layoutContext,
    });
    return (
      <div className="nb-form__grid">
        {visibleFields.map((field) => renderField(field, spans.get(field.name) ?? 12))}
      </div>
    );
  };

  const renderGroup = (group: FormLayoutGroup) => {
    if (group.collapsible) {
      return (
        <details
          key={group.label}
          className="nb-form__section nb-form__section--collapsible"
          open={!group.defaultCollapsed}
        >
          <summary className="nb-form__section-summary">
            <span className="nb-form__section-title">{group.label}</span>
            <i className="ph ph-caret-down nb-form__section-caret" aria-hidden="true" />
          </summary>
          <div className="nb-form__section-body">
            {renderFields(group.fields, { avoidOrphanFields: group.avoidOrphanFields })}
          </div>
        </details>
      );
    }
    return (
      <section key={group.label} className="nb-form__section">
        <h3 className="nb-form__section-title">{group.label}</h3>
        {renderFields(group.fields, { avoidOrphanFields: group.avoidOrphanFields })}
      </section>
    );
  };

  const renderLayout = (layout: FormLayoutModel) => {
    if (layout.type === 'tabs') {
      const groups = [...layout.tabs, ...(layout.overflow ? [layout.overflow] : [])];
      const current = groups[activeTab] ?? groups[0];
      const tabPanelId = current ? `nb-form-tabpanel-${current.label}` : undefined;

      return (
        <div className="nb-form__tabs">
          <div className="nb-form__tabs-nav" role="tablist" aria-label={t('form.tabsAriaLabel')}>
            {groups.map((group, index) => {
              const tabIcon = resolveTabIcon(group.icon);
              const isActive = index === activeTab;

              return (
                <button
                  key={group.label}
                  type="button"
                  role="tab"
                  id={`nb-form-tab-${group.label}`}
                  aria-selected={isActive}
                  aria-controls={isActive ? tabPanelId : undefined}
                  className={`nb-form__tab-button${isActive ? ' nb-form__tab-button--active' : ''}`}
                  onClick={() => setActiveTab(index)}
                >
                  {tabIcon && <i className={tabIcon} aria-hidden="true" />}
                  <span>{group.label}</span>
                </button>
              );
            })}
          </div>
          {current && (
            <div
              className="nb-form__tabs-body"
              role="tabpanel"
              id={tabPanelId}
              aria-labelledby={`nb-form-tab-${current.label}`}
            >
              {renderFields(current.fields)}
            </div>
          )}
        </div>
      );
    }
    if (layout.type === 'sections') {
      return <>{layout.sections.map(renderGroup)}{layout.overflow && renderGroup(layout.overflow)}</>;
    }
    return renderFields(layout.fields);
  };

  const detailGrid = options.detailFields ? (
    <NativeDetailGrid
      allowAdding={options.allowAdding}
      allowDeleting={options.allowDeleting}
      allowUpdating={options.allowUpdating}
      detailFields={options.detailFields}
      detailErrors={detailErrors}
      httpClient={httpClient}
      onClearCellError={clearDetailCellError}
      onRowsMutated={notifyDetailRowsMutated}
      prependData={prependDataRef.current}
      remoteOptions={remoteOptions}
      rows={detailRows}
      summary={options.detailSummary}
      onRowsChange={setNextDetailRows}
    />
  ) : null;

  return (
    <div className={`nb-form${options.detailFields ? ' nb-form--with-detail' : ''} ${options.className ?? ''}`}>
      {options.detailFields ? (
        <div className="nb-form__master-detail">
          <div className="nb-form__master-panel">{renderLayout(formLayoutModel)}</div>
          <div className="nb-form__detail-panel">{detailGrid}</div>
        </div>
      ) : (
        renderLayout(formLayoutModel)
      )}
    </div>
  );
});

NativeFormView.displayName = 'NativeFormView';
