import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Field } from '../../field/Field';
import type { FormDataRecord } from '../../form/FormDataSnapshot';

interface DependencyEntry {
  url: string | null;
  values: unknown[];
}

/**
 * Compares two primitive-or-reference values.
 * Uses strict equality for primitives (covers the vast majority of form values).
 * Falls back to JSON.stringify only for objects/arrays (rare: e.g. multi-select).
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * For each field that declares `dependsOn`, invalidate its entity query
 * (keyed by the field's `url`) whenever one of the watched form values changes.
 *
 * Only fires when a dependency value actually changes (compared per-value).
 * Skips the initial mount run to prevent spurious refetches when a dialog opens
 * with already-cached data (BUG-009).
 *
 * Also skips evaluation while `formData` is `null`, which SmartCrudPage uses
 * for edit dialogs that have not hydrated their initial snapshot yet.
 */
export function useDependsOn(fields: Field[], formData: FormDataRecord | null): void {
  const queryClient = useQueryClient();
  const dependentFields = fields.filter((field) => field.dependsOn?.length);

  // Build current entries on every render (cheap: just extracting values).
  const currentEntries: DependencyEntry[] | null =
    formData == null
      ? null
      : dependentFields.map((field) => ({
          url: field.url ?? null,
          values: (field.dependsOn ?? []).map((dep) => formData[dep]),
        }));

  const isMounted = useRef(false);
  const previousEntriesRef = useRef<DependencyEntry[] | null>(null);

  // Single JSON.stringify for the effect dependency — triggers only when
  // dependency values actually change. The structured entries above are
  // used directly for comparison, avoiding the double-parse of the
  // previous implementation.
  const snapshotKey = JSON.stringify(
    currentEntries?.map((e) => e.values) ?? null,
  );

  useEffect(() => {
    // Skip the first run (mount guard — BUG-009)
    if (!isMounted.current) {
      isMounted.current = true;
      previousEntriesRef.current = currentEntries;
      return;
    }

    // Skip while formData is null (edit dialog hydrating)
    if (currentEntries == null) {
      previousEntriesRef.current = null;
      return;
    }

    const previousEntries = previousEntriesRef.current ?? [];
    previousEntriesRef.current = currentEntries;

    currentEntries.forEach((entry, index) => {
      const previousValues = previousEntries[index]?.values ?? [];

      const changed =
        entry.values.length !== previousValues.length ||
        entry.values.some((val, i) => !valuesEqual(val, previousValues[i]));

      if (!changed || !entry.url) return;

      queryClient.invalidateQueries({ queryKey: [entry.url] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotKey, queryClient]);
}
