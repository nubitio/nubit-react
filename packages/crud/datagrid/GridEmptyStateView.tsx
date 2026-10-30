import React from 'react';
import { Button, EmptyState } from '@nubitio/ui';
import { useCoreTranslation } from '@nubitio/core';
import type { ResourceEmptyState } from '../crud/ResourceConfig';

export function GridEmptyStateView({
  emptyState,
  fallbackTitle,
  filtered = false,
  error,
  onClearFilters,
  onRetry,
  onAdd,
}: {
  emptyState?: ResourceEmptyState;
  fallbackTitle: string;
  filtered?: boolean;
  error?: { status?: number } | null;
  onClearFilters?: () => void;
  onRetry?: () => void;
  onAdd?: () => void;
}) {
  const { t } = useCoreTranslation();
  const forbidden = error?.status === 403;
  if (!error && !filtered && emptyState?.render && onRetry) {
    return (
      <div className="nb-datagrid__empty nb-datagrid__empty--custom">
        {emptyState.render({ onAdd, refresh: onRetry })}
      </div>
    );
  }
  return (
    <div className="nb-datagrid__empty" aria-live="polite">
      <EmptyState
        title={
          error
            ? t(forbidden ? 'grid.accessDeniedTitle' : 'grid.loadErrorTitle')
            : filtered
              ? t('grid.noMatchingRecords')
              : (emptyState?.title ?? fallbackTitle)
        }
        description={
          error
            ? t(forbidden ? 'grid.accessDeniedDescription' : 'grid.loadErrorDescription')
            : filtered
              ? t('grid.noMatchingRecordsDescription')
              : emptyState?.description
        }
        icon={
          error
            ? forbidden
              ? 'lock'
              : 'warning-circle'
            : filtered
              ? 'magnifying-glass'
              : (emptyState?.icon ?? 'database')
        }
        variant={error ? 'danger' : (emptyState?.variant ?? 'default')}
        action={
          error
            ? !forbidden &&
              onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                  {t('grid.retry')}
                </Button>
              )
            : filtered &&
              onClearFilters && (
                <Button variant="secondary" onClick={onClearFilters}>
                  {t('grid.clearFilters')}
                </Button>
              )
        }
        size="sm"
      />
    </div>
  );
}
