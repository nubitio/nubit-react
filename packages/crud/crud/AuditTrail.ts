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