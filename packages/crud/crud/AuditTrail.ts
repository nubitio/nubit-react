import type { ReactNode } from 'react';

export interface AuditEntry {
  id: string | number;
  timestamp: string; // ISO 8601
  user: string;
  action: 'create' | 'update' | 'delete';
  changes: Record<string, { before: unknown; after: unknown }>;
}

export interface AuditTrailConfig {
  enabled: boolean;
  apiUrl: string | ((id: string | number) => string);
  renderEntry?: (entry: AuditEntry) => ReactNode;
}
