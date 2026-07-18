import { useCallback, useMemo, useState } from 'react';
import type { Field } from '../field/Field';
import type { ResourceConfig } from './ResourceConfig';

export interface ColumnChooserState {
  /** The chooser-eligible fields, already restricted to real grid columns — see resolveChooserFields. */
  fields: Field[];
  /** Same shape CrudPage's grid already consumes: null = no restriction. */
  visibleColumns: string[];
  isVisible: (name: string) => boolean;
  toggle: (name: string) => void;
  selectAll: () => void;
  reset: () => void;
  /** Whether the current selection differs from the resource's default — drives the trigger button's active/dot state. */
  isCustomized: boolean;
}

function storageKey(resourceId: string): string {
  return `column-chooser:${resourceId}`;
}

function readFromStorage(resourceId: string): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey(resourceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : null;
  } catch {
    return null;
  }
}

function writeToStorage(resourceId: string, names: string[]): void {
  try {
    localStorage.setItem(storageKey(resourceId), JSON.stringify(names));
  } catch {
    // localStorage may be unavailable in some environments; fail silently
  }
}

/**
 * Restricts the incoming field list to ones actually registered as a real
 * grid column. `fields` as handed to consumers is frequently the *form*
 * field list too (id, form-only toggles, detail sub-fields, etc.) — without
 * this, the chooser would offer to "show" fields that were never a valid
 * grid column under the old preset system either, they just silently never
 * appeared because no preset referenced them.
 *
 * When the resource declares `columnPresets`, the union of every preset's
 * `columns` is the authoritative set of real grid columns. Resources with
 * no presets configured have no such signal to filter by, so every field is
 * left as chooser-eligible (matches the always-fully-visible default for
 * those resources).
 */
function resolveChooserFields(resource: ResourceConfig, fields: Field[]): Field[] {
  if (!resource.columnPresets?.length) return fields;
  const allowedNames = new Set(resource.columnPresets.flatMap((preset) => preset.columns));
  return fields.filter((field) => allowedNames.has(field.name));
}

/**
 * Resolves the resource's default column set: the `defaultPreset` entry
 * from `columnPresets` when configured (reusing that config as the chooser's
 * default/reset state, not as user-facing preset buttons), otherwise every
 * field — i.e. resources that never declared presets start fully visible.
 */
function defaultColumnsFor(resource: ResourceConfig, allNames: string[]): string[] {
  if (resource.columnPresets?.length) {
    const preset =
      resource.columnPresets.find((p) => p.key === resource.defaultPreset) ?? resource.columnPresets[0];
    if (preset) return preset.columns.filter((name) => allNames.includes(name));
  }
  return allNames;
}

export function useColumnChooser(resource: ResourceConfig, fields: Field[]): ColumnChooserState {
  const chooserFields = useMemo(() => resolveChooserFields(resource, fields), [resource, fields]);
  const allNames = useMemo(() => chooserFields.map((f) => f.name), [chooserFields]);
  const defaultNames = useMemo(() => defaultColumnsFor(resource, allNames), [resource, allNames]);

  const [visible, setVisible] = useState<Set<string>>(() => {
    const stored = readFromStorage(resource.id);
    const initial = stored ? stored.filter((name) => allNames.includes(name)) : defaultNames;
    return new Set(initial.length > 0 ? initial : allNames);
  });

  const toggle = useCallback(
    (name: string) => {
      setVisible((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          if (next.size <= 1) return prev; // always keep at least one column visible
          next.delete(name);
        } else {
          next.add(name);
        }
        writeToStorage(resource.id, allNames.filter((n) => next.has(n)));
        return next;
      });
    },
    [resource.id, allNames],
  );

  const selectAll = useCallback(() => {
    setVisible(new Set(allNames));
    writeToStorage(resource.id, allNames);
  }, [allNames, resource.id]);

  const reset = useCallback(() => {
    setVisible(new Set(defaultNames));
    writeToStorage(resource.id, defaultNames);
  }, [defaultNames, resource.id]);

  // Preserve field order (Set insertion order can't be relied on across toggles).
  const visibleColumns = useMemo(() => allNames.filter((name) => visible.has(name)), [allNames, visible]);

  const isCustomized =
    visibleColumns.length !== defaultNames.length ||
    defaultNames.some((name) => !visible.has(name));

  return {
    fields: chooserFields,
    visibleColumns,
    isVisible: (name: string) => visible.has(name),
    toggle,
    selectAll,
    reset,
    isCustomized,
  };
}
