import React, { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getCoreLocale,
  getCoreTimezone,
  useCoreHttpClient,
  useCoreTranslation,
} from '@nubitio/core';
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  Skeleton,
  Timeline,
  TimelineItem,
  type TimelineItemTone,
} from '@nubitio/ui';
import type { AuditEntry, AuditFieldLabelResolver } from './AuditTrail';
import { prepareAuditEntries } from './AuditTrail';
import { resolveDrawerWidth } from '../view/drawerSizes';
import type { CrudDrawerSize } from '../view/drawerSizes';
import './AuditTrailPanel.scss';

export interface AuditTrailPanelProps {
  url: string | null;
  renderEntry?: (entry: AuditEntry) => ReactNode;
  visible: boolean;
  onClose: () => void;
  recordSubtitle?: string;
  resolveFieldLabel: AuditFieldLabelResolver;
  drawerSize?: CrudDrawerSize;
}

const ACTION_BADGE: Record<AuditEntry['action'], 'success' | 'info' | 'danger'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
};

const ACTION_TONE: Record<AuditEntry['action'], TimelineItemTone> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
};

function formatAuditValue(value: unknown, yesLabel: string, noLabel: string): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? yesLabel : noLabel;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function DefaultEntryContent({
  entry,
  resolveFieldLabel,
  yesLabel,
  noLabel,
}: {
  entry: AuditEntry;
  resolveFieldLabel: AuditFieldLabelResolver;
  yesLabel: string;
  noLabel: string;
}): React.JSX.Element {
  const changeKeys = Object.keys(entry.changes);

  if (changeKeys.length === 0) {
    return <></>;
  }

  return (
    <ul className="nb-audit-trail__changes">
      {changeKeys.map((field) => {
        const { before, after } = entry.changes[field];
        return (
          <li key={field} className="nb-audit-trail__change">
            <span className="nb-audit-trail__field">{resolveFieldLabel(field)}</span>
            <div className="nb-audit-trail__diff">
              <span className="nb-audit-trail__value nb-audit-trail__value--before">
                {formatAuditValue(before, yesLabel, noLabel)}
              </span>
              <span className="nb-audit-trail__arrow" aria-hidden="true">
                →
              </span>
              <span className="nb-audit-trail__value nb-audit-trail__value--after">
                {formatAuditValue(after, yesLabel, noLabel)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DefaultEntryRenderer({
  entry,
  resolveFieldLabel,
  yesLabel,
  noLabel,
}: {
  entry: AuditEntry;
  resolveFieldLabel: AuditFieldLabelResolver;
  yesLabel: string;
  noLabel: string;
}): React.JSX.Element {
  const { t } = useCoreTranslation();
  const date = new Date(entry.timestamp);
  const formatted = Number.isNaN(date.getTime())
    ? entry.timestamp
    : date.toLocaleString(getCoreLocale(), { timeZone: getCoreTimezone() });

  const actionLabels: Record<AuditEntry['action'], string> = {
    create: t('auditTrail.action.create'),
    update: t('auditTrail.action.update'),
    delete: t('auditTrail.action.delete'),
  };

  return (
    <TimelineItem
      status="complete"
      tone={ACTION_TONE[entry.action]}
      title={
        <span className="nb-audit-trail__meta">
          <span className="nb-audit-trail__user">{entry.user}</span>
          <Badge variant={ACTION_BADGE[entry.action]} size="sm" pill>
            {actionLabels[entry.action]}
          </Badge>
        </span>
      }
      timestamp={formatted}
      dateTime={entry.timestamp}
    >
      <DefaultEntryContent
        entry={entry}
        resolveFieldLabel={resolveFieldLabel}
        yesLabel={yesLabel}
        noLabel={noLabel}
      />
    </TimelineItem>
  );
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; entries: AuditEntry[] };

function AuditTrailSkeleton(): React.JSX.Element {
  return (
    <div className="nb-audit-trail__skeleton" aria-busy="true">
      <Skeleton variant="rect" height={72} />
      <Skeleton variant="rect" height={72} />
      <Skeleton variant="rect" height={72} />
    </div>
  );
}

export function AuditTrailPanel({
  url,
  renderEntry,
  visible,
  onClose,
  recordSubtitle,
  resolveFieldLabel,
  drawerSize = 'sm',
}: AuditTrailPanelProps): React.JSX.Element {
  const { t } = useCoreTranslation();
  const httpClient = useCoreHttpClient();
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' });
  const yesLabel = t('common.yes');
  const noLabel = t('common.no');

  const loadEntries = useCallback(() => {
    if (url === null) {
      setFetchState({ status: 'idle' });
      return;
    }

    setFetchState({ status: 'loading' });
    httpClient
      .get<AuditEntry[]>(url)
      .then((response) => {
        setFetchState({
          status: 'success',
          entries: prepareAuditEntries(response.data),
        });
      })
      .catch(() => {
        setFetchState({ status: 'error' });
      });
  }, [httpClient, url]);

  useEffect(() => {
    if (!visible) {
      setFetchState({ status: 'idle' });
      return;
    }
    loadEntries();
  }, [loadEntries, visible]);

  const drawerTitle = recordSubtitle ? (
    <div className="nb-audit-trail__header">
      <p className="nb-audit-trail__record">{recordSubtitle}</p>
      <p className="nb-audit-trail__drawer-label">{t('auditTrail.title')}</p>
    </div>
  ) : (
    <div>{t('auditTrail.title')}</div>
  );

  const body = (() => {
    if (url === null) {
      return (
        <EmptyState
          fill
          icon="cursor-click"
          title={t('auditTrail.selectRecord')}
          description={t('auditTrail.selectRecordHint')}
          size="sm"
        />
      );
    }

    if (fetchState.status === 'loading') {
      return <AuditTrailSkeleton />;
    }

    if (fetchState.status === 'error') {
      return (
        <div className="nb-audit-trail__error">
          <EmptyState
            fill
            variant="danger"
            icon="warning-circle"
            title={t('auditTrail.error')}
            size="sm"
            action={
              <Button variant="secondary" size="sm" onClick={loadEntries}>
                {t('auditTrail.retry')}
              </Button>
            }
          />
        </div>
      );
    }

    if (fetchState.status === 'success' && fetchState.entries.length === 0) {
      return (
        <EmptyState
          fill
          icon="clock-counter-clockwise"
          title={t('auditTrail.empty')}
          description={t('auditTrail.emptyHint')}
          size="sm"
        />
      );
    }

    if (fetchState.status === 'success') {
      return (
        <Timeline variant="log" aria-label={t('auditTrail.title')}>
          {fetchState.entries.map((entry) =>
            renderEntry ? (
              <React.Fragment key={String(entry.id)}>{renderEntry(entry)}</React.Fragment>
            ) : (
              <DefaultEntryRenderer
                key={String(entry.id)}
                entry={entry}
                resolveFieldLabel={resolveFieldLabel}
                yesLabel={yesLabel}
                noLabel={noLabel}
              />
            ),
          )}
        </Timeline>
      );
    }

    return null;
  })();

  return (
    <Drawer
      isOpen={visible}
      onClose={onClose}
      title={drawerTitle}
      width={resolveDrawerWidth({ drawerSize })}
      side="right"
      scrim="subtle"
      closeLabel={t('auditTrail.closeButton')}
      aria-label={t('auditTrail.title')}
      className="nb-audit-trail-drawer"
    >
      <div className="nb-audit-trail">{body}</div>
    </Drawer>
  );
}