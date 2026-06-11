import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useCoreHttpClient, getCoreLocale, getCoreTimezone, useCoreTranslation } from '@nubitio/core';
import type { AuditEntry } from './AuditTrail';

export interface AuditTrailPanelProps {
  url: string | null;
  renderEntry?: (entry: AuditEntry) => ReactNode;
  visible: boolean;
  onClose: () => void;
}

const ACTION_COLORS: Record<AuditEntry['action'], string> = {
  create: '#2e7d32',
  update: '#1565c0',
  delete: '#c62828',
};

function DefaultEntryRenderer({ entry }: { entry: AuditEntry }): React.JSX.Element {
  const { t } = useCoreTranslation();
  const date = new Date(entry.timestamp);
  const formatted = Number.isNaN(date.getTime()) ? entry.timestamp : date.toLocaleString(getCoreLocale(), { timeZone: getCoreTimezone() });

  const actionLabels: Record<AuditEntry['action'], string> = {
    create: t('auditTrail.action.create'),
    update: t('auditTrail.action.update'),
    delete: t('auditTrail.action.delete'),
  };

  const changeKeys = Object.keys(entry.changes);

  return (
    <li
      style={{
        borderBottom: '1px solid #e0e0e0',
        padding: '10px 0',
        listStyle: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#757575' }}>{formatted}</span>
        <span style={{ fontSize: 12, color: '#424242' }}>{entry.user}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: 4,
            backgroundColor: ACTION_COLORS[entry.action],
            color: '#fff',
          }}
        >
          {actionLabels[entry.action]}
        </span>
      </div>
      {changeKeys.length > 0 && (
        <ul style={{ margin: '4px 0 0 0', padding: '0 0 0 16px' }}>
          {changeKeys.map((field) => {
            const { before, after } = entry.changes[field];
            return (
              <li key={field} style={{ fontSize: 12, color: '#616161' }}>
                <strong>{field}:</strong>{' '}
                <span style={{ color: '#c62828' }}>{String(before ?? '—')}</span>
                {' → '}
                <span style={{ color: '#2e7d32' }}>{String(after ?? '—')}</span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; entries: AuditEntry[] };

export function AuditTrailPanel({
  url,
  renderEntry,
  visible,
  onClose,
}: AuditTrailPanelProps): React.JSX.Element | null {
  const { t } = useCoreTranslation();
  const httpClient = useCoreHttpClient();
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });

  useEffect(() => {
    if (!visible || url === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset local async state when panel closes or no record is selected
      setFetchState({ status: 'idle' });
      return;
    }

    let cancelled = false;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- transition request state before subscribing to the async HTTP response
    setFetchState({ status: 'loading' });

    httpClient
      .get<AuditEntry[]>(url)
      .then((response) => {
        if (!cancelled) setFetchState({ status: 'success', entries: response.data });
      })
      .catch(() => {
        if (!cancelled) setFetchState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [httpClient, url, visible]);

  if (!visible) return null;

  return (
    <aside
      className="nb-audit-trail-panel"
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: 4,
        padding: '12px 16px',
        backgroundColor: '#fafafa',
        minWidth: 280,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <strong style={{ fontSize: 14 }}>{t('auditTrail.title')}</strong>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('auditTrail.closeButton')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '0 4px',
            color: '#616161',
          }}
        >
          ×
        </button>
      </div>

      {url === null ? (
        <p style={{ fontSize: 13, color: '#757575', margin: 0 }}>{t('auditTrail.selectRecord')}</p>
      ) : fetchState.status === 'loading' ? (
        <p style={{ fontSize: 13, color: '#757575', margin: 0 }}>{t('auditTrail.loading')}</p>
      ) : fetchState.status === 'error' ? (
        <p style={{ fontSize: 13, color: '#c62828', margin: 0 }}>{t('auditTrail.error')}</p>
      ) : fetchState.status === 'success' ? (
        fetchState.entries.length === 0 ? (
          <p style={{ fontSize: 13, color: '#757575', margin: 0 }}>{t('auditTrail.empty')}</p>
        ) : (
          <ul style={{ margin: 0, padding: 0 }}>
            {fetchState.entries.map((entry) =>
              renderEntry ? (
                <React.Fragment key={String(entry.id)}>{renderEntry(entry)}</React.Fragment>
              ) : (
                <DefaultEntryRenderer key={String(entry.id)} entry={entry} />
              ),
            )}
          </ul>
        )
      ) : null}
    </aside>
  );
}
