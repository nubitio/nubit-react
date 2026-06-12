import { useCallback, useEffect, useRef, useState } from 'react';
import type { Field } from '../field/Field';
import type { FormDataRecord } from './FormDataSnapshot';
import type { DetailFieldErrors } from './FormApiViolations';
import type { UploadedFile } from './UploadedFile';
import { buildEmptyRow, type PrependDataMap } from './FormDataTransform';

export type FieldState = {
  readonly?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  validationEnabled?: boolean;
};

export interface UseFormStateOptions {
  fields: Field[];
  onFieldDataChanged?: (data: FormDataRecord) => void;
}

/**
 * Owns the form's value and error state: main-form data, detail rows,
 * per-field UI state, validation errors, upload tracking and edit mode.
 * Refs mirror the latest values so imperative callers (FormHandle, submit
 * accessors) read fresh data without re-rendering.
 *
 * Option loading, layout and rendering stay in the form view — this hook is
 * the state seam, independently testable without the 900-line closure.
 */
export function useFormState({ fields, onFieldDataChanged }: UseFormStateOptions) {
  const isEdit = useRef(false);
  const uploadedFiles = useRef<UploadedFile[]>([]);
  const existingMediaByField = useRef<Record<string, FormDataRecord>>({});

  const upsertUploadedFile = useCallback((entry: UploadedFile) => {
    uploadedFiles.current = [
      ...uploadedFiles.current.filter((file) => file.name !== entry.name),
      entry,
    ];
  }, []);

  const [formData, setFormData] = useState<FormDataRecord>(() => buildEmptyRow(fields));
  const formDataRef = useRef(formData);
  const [detailRows, setDetailRows] = useState<FormDataRecord[]>([]);
  const detailRowsRef = useRef(detailRows);
  const [fieldState, setFieldState] = useState<Record<string, FieldState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detailErrors, setDetailErrors] = useState<DetailFieldErrors>({});
  const prependDataRef = useRef<PrependDataMap>(new Map());

  const setNextFormData = useCallback(
    (nextData: FormDataRecord) => {
      formDataRef.current = nextData;
      setFormData(nextData);
      onFieldDataChanged?.(nextData);
    },
    [onFieldDataChanged],
  );

  const setNextDetailRows = useCallback((nextRows: FormDataRecord[]) => {
    detailRowsRef.current = nextRows;
    setDetailRows(nextRows);
  }, []);

  const setFieldValue = useCallback(
    (name: string, value: unknown) => {
      const field = fields.find((candidate) => candidate.name === name);
      const nextData = { ...formDataRef.current, [name]: value };
      formDataRef.current = nextData;
      setFormData(nextData);
      setErrors((current) => ({ ...current, [name]: '' }));
      onFieldDataChanged?.(nextData);
      void (field?.onChange as ((value: unknown) => void | Promise<void>) | undefined)?.(value);
    },
    [fields, onFieldDataChanged],
  );

  const setEditMode = useCallback((value: boolean) => {
    isEdit.current = value;
  }, []);

  const resetUploadSession = useCallback(() => {
    uploadedFiles.current = [];
  }, []);

  const setExistingMedia = useCallback((media: Record<string, FormDataRecord>) => {
    existingMediaByField.current = media;
  }, []);

  const clearExistingMedia = useCallback((name: string) => {
    delete existingMediaByField.current[name];
  }, []);

  const resetPrependData = useCallback(() => {
    prependDataRef.current = new Map();
  }, []);

  const clearDetailCellError = useCallback((rowIndex: number, fieldName: string) => {
    setDetailErrors((current) => {
      const rowErrors = current[rowIndex];
      if (!rowErrors?.[fieldName]) return current;
      const nextRowErrors = { ...rowErrors };
      delete nextRowErrors[fieldName];
      const next = { ...current };
      if (Object.keys(nextRowErrors).length === 0) {
        delete next[rowIndex];
      } else {
        next[rowIndex] = nextRowErrors;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  useEffect(() => {
    detailRowsRef.current = detailRows;
  }, [detailRows]);

  return {
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
  };
}

export type FormState = ReturnType<typeof useFormState>;
