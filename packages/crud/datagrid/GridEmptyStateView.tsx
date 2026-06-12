import React from 'react';
import { EmptyState } from '@nubitio/ui';
import type { ResourceEmptyState } from '../crud/ResourceConfig';

export function GridEmptyStateView({
  emptyState,
  fallbackTitle,
}: {
  emptyState?: ResourceEmptyState;
  fallbackTitle: string;
}) {
  return (
    <div className="nb-datagrid__empty" aria-live="polite">
      <EmptyState
        title={emptyState?.title ?? fallbackTitle}
        description={emptyState?.description}
        icon={emptyState?.icon ?? 'database'}
        variant={emptyState?.variant ?? 'default'}
        size="sm"
      />
    </div>
  );
}
