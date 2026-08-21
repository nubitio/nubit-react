import React from 'react';
import { Button, EmptyState } from '@nubitio/ui';
import { useNotifications, type UseNotificationsOptions } from './useNotifications';
import './NotificationPanel.scss';

export interface NotificationPanelProps extends UseNotificationsOptions {
  title?: string;
  emptyTitle?: string;
  markAllReadLabel?: string;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const thresholds: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.34524, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];

  let value = diffSeconds;
  for (const [limit, unit] of thresholds) {
    if (Math.abs(value) < limit) return formatter.format(Math.round(value), unit);
    value /= limit;
  }

  return formatter.format(Math.round(value), 'year');
}

/** Renders inside an AdminHeaderAction.renderPanel — see AdminHeader's `actions` prop. */
export function NotificationPanel({
  title = 'Notifications',
  emptyTitle = "You're all caught up",
  markAllReadLabel = 'Mark all as read',
  ...options
}: NotificationPanelProps) {
  const { items, unreadCount, loading, markAsRead } = useNotifications(options);

  return (
    <div className="nb-notification-panel">
      <div className="nb-notification-panel__header">
        <span className="nb-notification-panel__title">{title}</span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              items.filter((item) => !item.read).forEach((item) => markAsRead(item.id))
            }
          >
            {markAllReadLabel}
          </Button>
        )}
      </div>

      {!loading && items.length === 0 && <EmptyState icon="bell-slash" title={emptyTitle} />}

      <ul className="nb-notification-panel__list">
        {items.map((item) => (
          <li
            key={item.id}
            className={`nb-notification-panel__item${item.read ? '' : ' nb-notification-panel__item--unread'}`}
          >
            <button
              type="button"
              className="nb-notification-panel__item-button"
              onClick={() => !item.read && markAsRead(item.id)}
            >
              <span className="nb-notification-panel__item-subject">{item.subject}</span>
              <span className="nb-notification-panel__item-body">{item.body}</span>
              <span className="nb-notification-panel__item-time">
                {formatRelativeTime(item.createdAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
