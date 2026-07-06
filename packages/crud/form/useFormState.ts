import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * Imperative read access to the freshest form state. The functions are
 * identity-stable and never trigger renders — safe in event handlers,
 * effects and submit paths. The backing refs stay private to useFormState.
 */
export interface FormStateAccessors {
  getFormData(): FormDataRecord;
  getFieldValue(name: string): unknown;
  getDetailRows(): FormDataRecord[];
  getUploadedFiles(): UploadedFile[];
  getUploadedFile(name: string): UploadedFile | undefined;
  isEditMode(): boolean;
  /** The captured media object for a FILE field, or null when none exists. */
  getExistingMedia(name: string): FormDataRecord | null;
  getPrependData(name: string): FormDataRecord[] | undefined;
  /** The live prepend-option store, for pipelines that register options while normalizing (see normalizeFormData). */
  getPrependDataMap(): PrependDataMap;
}

/**
 * Owns the form's value and error state: main-form data, detail rows,
 * per-field UI state, validation errors, upload tracking and edit mode.
 * Imperative callers (FormHandle, submit accessors) read fresh data through
 * `accessors`; mutations go through the intent methods. The backing refs
 * never leave this module.
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

  // Stable identity: every accessor closes over refs, so callers can list
  // `accessors` in dependency arrays without re-running effects.
  const accessors = useMemo<FormStateAccessors>(
    () => ({
      getFormData: () => formDataRef.current,
      getFieldValue: (name) => formDataRef.current[name],
      getDetailRows: () => detailRowsRef.current,
      getUploadedFiles: () => uploadedFiles.current,
      getUploadedFile: (name) => uploadedFiles.current.find((file) => file.name === name),
      isEditMode: () => isEdit.current,
      getExistingMedia: (name) => existingMediaByField.current[name] ?? null,
      getPrependData: (name) => prependDataRef.current.get(name),
      getPrependDataMap: () => prependDataRef.current,
    }),
    [],
  );

  return {
    accessors,
    upsertUploadedFile,
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
    clearDetailCellError,
    setEditMode,
    resetUploadSession,
    setExistingMedia,
    clearExistingMedia,
    resetPrependData,
  };
}

export type FormState = ReturnType<typeof useFormState>;
