import { useCallback, useRef, useState } from 'react';
import type { CoreHttpClient, DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { BackendAdapter } from '../adapter/BackendAdapter';
import { HydraAdapter } from '../adapter/HydraAdapter';
import { FieldType } from '../field/FieldType';
import { serializeFormFields } from '../form/serializeFormData';

/** Fields that are safe to edit inline (identity/readonly/file types are excluded). */
export function canEditFieldInline(field: Field): boolean {
  return (
    !field.isIdentity &&
    !field.readonly &&
    field.type !== FieldType.FILE &&
    field.visibleOnForm !== false
  );
}

export interface InlineEditOptions {
  /** 'row' = single row at a time; 'batch' = multiple rows simultaneously. */
  mode: 'row' | 'batch';
  url: string;
  idField: string;
  adapter?: BackendAdapter;
  httpClient: CoreHttpClient;
  fields: Field[];
  onSaveSuccess?: () => void;
  onSaveError?: (key: unknown, err: unknown) => void;
}

export interface UseInlineEditResult {
  draftRows: Map<unknown, DataRecord>;
  savingRows: Set<unknown>;
  rowErrors: Map<unknown, Record<string, string>>;
  isEditing: (key: unknown) => boolean;
  startEdit: (row: DataRecord) => void;
  cancelEdit: (key: unknown) => void;
  discardAll: () => void;
  updateDraft: (key: unknown, fieldName: string, value: unknown) => void;
  saveRow: (key: unknown) => Promise<void>;
  saveAll: () => Promise<void>;
}

export function useInlineEdit({
  mode,
  url,
  idField,
  adapter = HydraAdapter,
  httpClient,
  fields,
  onSaveSuccess,
  onSaveError,
}: InlineEditOptions): UseInlineEditResult {
  const [draftRows, setDraftRows] = useState<Map<unknown, DataRecord>>(new Map());
  const [savingRows, setSavingRows] = useState<Set<unknown>>(new Set());
  const [rowErrors, setRowErrors] = useState<Map<unknown, Record<string, string>>>(new Map());

  // Stable refs so async callbacks always see the latest values without
  // needing to be recreated on every render.
  const draftRowsRef = useRef(draftRows);
  draftRowsRef.current = draftRows;

  const optsRef = useRef({ url, idField, adapter, httpClient, fields, onSaveSuccess, onSaveError });
  optsRef.current = { url, idField, adapter, httpClient, fields, onSaveSuccess, onSaveError };

  const isEditing = useCallback((key: unknown) => draftRowsRef.current.has(key), []);

  const startEdit = useCallback(
    (row: DataRecord) => {
      const key = row[optsRef.current.idField];
      setDraftRows((prev) => {
        // 'row' mode: replace all; 'batch' mode: accumulate
        const base: [unknown, DataRecord][] = mode === 'row' ? [] : Array.from(prev.entries());
        return new Map([...base, [key, { ...row }]]);
      });
      setRowErrors((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    },
    [mode],
  );

  const cancelEdit = useCallback((key: unknown) => {
    setDraftRows((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
    setRowErrors((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const discardAll = useCallback(() => {
    setDraftRows(new Map());
    setRowErrors(new Map());
  }, []);

  const updateDraft = useCallback((key: unknown, fieldName: string, value: unknown) => {
    setDraftRows((prev) => {
      const current = prev.get(key);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(key, { ...current, [fieldName]: value });
      return next;
    });
  }, []);

  // Returns true on success so saveAll can count successes.
  const doSaveRow = useCallback(async (key: unknown): Promise<boolean> => {
    const { url: u, adapter: a, httpClient: http, fields: fs, onSaveError: onErr } = optsRef.current;
    const draft = draftRowsRef.current.get(key);
    if (!draft) return false;

    // Required-field validation
    const errors: Record<string, string> = {};
    fs.forEach((field) => {
      if (!canEditFieldInline(field)) return;
      if (field.required && (draft[field.name] == null || draft[field.name] === '')) {
        errors[field.name] = 'required';
      }
    });
    if (Object.keys(errors).length > 0) {
      setRowErrors((prev) => new Map(prev).set(key, errors));
      return false;
    }

    setSavingRows((prev) => new Set([...prev, key]));

    const editableFields = fs.filter(canEditFieldInline);
    const serialized = serializeFormFields(draft, editableFields, {
      uploadedFiles: [],
      getFieldValue: (name) => draft[name],
    });

    try {
      await http.patch(a.buildItemUrl(u, key as string | number), serialized);
      setDraftRows((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      setRowErrors((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return true;
    } catch (err: unknown) {
      onErr?.(key, err);
      // Map 422 violations onto field-level errors
      if (
        typeof err === 'object' && err !== null &&
        'status' in err && (err as { status: number }).status === 422 &&
        'data' in err
      ) {
        const data = (err as { data: unknown }).data;
        if (typeof data === 'object' && data !== null && 'violations' in data) {
          const violations = (data as { violations: Array<{ propertyPath: string; message: string }> }).violations ?? [];
          const fieldErrors: Record<string, string> = {};
          violations.forEach((v) => { fieldErrors[v.propertyPath] = v.message; });
          setRowErrors((prev) => new Map(prev).set(key, fieldErrors));
        }
      }
      return false;
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  const saveRow = useCallback(
    async (key: unknown): Promise<void> => {
      const ok = await doSaveRow(key);
      if (ok) optsRef.current.onSaveSuccess?.();
    },
    [doSaveRow],
  );

  const saveAll = useCallback(async (): Promise<void> => {
    const keys = Array.from(draftRowsRef.current.keys());
    const results = await Promise.allSettled(keys.map((key) => doSaveRow(key)));
    const anySuccess = results.some((r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<boolean>).value);
    if (anySuccess) optsRef.current.onSaveSuccess?.();
  }, [doSaveRow]);

  return {
    draftRows,
    savingRows,
    rowErrors,
    isEditing,
    startEdit,
    cancelEdit,
    discardAll,
    updateDraft,
    saveRow,
    saveAll,
  };
}
