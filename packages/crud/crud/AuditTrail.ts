import type { ReactNode } from 'react';
import type { DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import type { CrudDrawerSize } from '../view/drawerSizes';

export interface AuditEntry {
  id: string | number;
  timestamp: string; // ISO 8601
  user: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, { before: unknown; after: unknown }>;
}

export type AuditFieldLabelResolver = (field: string) => string;

export interface AuditTrailConfig<T extends DataRecord = DataRecord> {
  enabled: boolean;
  apiUrl: string | ((id: string | number) => string);
  /** Custom entry renderer. Receives resolved field labels via context in the panel. */
  renderEntry?: (entry: AuditEntry) => ReactNode;
  /**
   * Maps API field keys to display labels. When omitted, CrudPage falls back to
   * matching grid field labels from the active resource schema.
   */
  fieldLabels?: Record<string, string> | ((field: string) => string | undefined);
  /** One-line context shown under the drawer title for the selected row. */
  recordSubtitle?: (row: T) => string | undefined;
  /** Drawer width token. Default `sm` (480px) — read-only secondary panel. */
  drawerSize?: CrudDrawerSize;
  /** Adds a row-menu action that opens the audit drawer. Default true. */
  rowAction?: boolean;
}

export function createAuditFieldLabelResolver(
  config: AuditTrailConfig | undefined,
  fields: Field[],
): AuditFieldLabelResolver {
  const fieldLabelByName = new Map(
    fields.map((field) => [field.name, field.label || field.name] as const),
  );

  return (field: string): string => {
    const fromConfig = config?.fieldLabels;
    if (fromConfig) {
      if (typeof fromConfig === 'function') {
        const resolved = fromConfig(field);
        if (resolved) return resolved;
      } else if (fromConfig[field]) {
        return fromConfig[field];
      }
    }

    return fieldLabelByName.get(field) ?? field;
  };
}

function auditValuesEqual(before: unknown, after: unknown): boolean {
  return JSON.stringify(before) === JSON.stringify(after);
}

function mergeAuditEntryGroup(entries: AuditEntry[]): AuditEntry | null {
  const chronological = [...entries].sort((left, right) => {
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  });
  const mergedChanges: AuditEntry['changes'] = {};
  const fields = new Set<string>();

  for (const entry of chronological) {
    for (const field of Object.keys(entry.changes)) {
      fields.add(field);
    }
  }

  for (const field of fields) {
    const first = chronological.find((entry) => field in entry.changes);
    const last = [...chronological].reverse().find((entry) => field in entry.changes);
    if (!first || !last) continue;

    const before = first.changes[field].before;
    const after = last.changes[field].after;
    if (!auditValuesEqual(before, after)) {
      mergedChanges[field] = { before, after };
    }
  }

  if (Object.keys(mergedChanges).length === 0) {
    return null;
  }

  return {
    ...chronological[chronological.length - 1],
    changes: mergedChanges,
  };
}

/**
 * Merges burst audit rows that share the same second, user, and action.
 * Keeps the earliest "before" and latest "after" per field, and drops
 * entries whose net diff is empty (e.g. clear-then-restore in one save).
 */
export function consolidateAuditEntries(entries: AuditEntry[]): AuditEntry[] {
  if (entries.length <= 1) {
    return entries;
  }

  const consolidated: AuditEntry[] = [];
  let group: AuditEntry[] = [];

  const flushGroup = () => {
    if (group.length === 0) return;
    if (group.length === 1) {
      consolidated.push(group[0]);
    } else {
      const merged = mergeAuditEntryGroup(group);
      if (merged) consolidated.push(merged);
    }
    group = [];
  };

  const groupKey = (entry: AuditEntry) =>
    `${entry.timestamp.slice(0, 19)}|${entry.user}|${entry.action}`;

  for (const entry of entries) {
    if (group.length === 0 || groupKey(group[0]) === groupKey(entry)) {
      group.push(entry);
      continue;
    }
    flushGroup();
    group.push(entry);
  }

  flushGroup();
  return consolidated;
}

export function formatAuditValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}