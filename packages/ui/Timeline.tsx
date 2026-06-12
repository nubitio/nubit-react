import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import './Timeline.scss';

export type TimelineVariant = 'stepper' | 'log';
export type TimelineOrientation = 'vertical' | 'horizontal';
export type TimelineItemStatus = 'complete' | 'current' | 'pending' | 'error';
export type TimelineItemTone = 'default' | 'success' | 'info' | 'danger' | 'warning';

export interface TimelineProps {
  /** `stepper` — workflow stages with checkmarks; `log` — chronological event log. */
  variant?: TimelineVariant;
  /**
   * `horizontal` lays the steps in a row (wizard/checkout style: 1 → 2 → 3)
   * with labels under the markers. Stepper only — the log variant is
   * inherently vertical and ignores it.
   */
  orientation?: TimelineOrientation;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export interface TimelineItemProps {
  status: TimelineItemStatus;
  title: ReactNode;
  timestamp?: ReactNode;
  dateTime?: string;
  /** Marker accent for the `log` variant. */
  tone?: TimelineItemTone;
  children?: ReactNode;
  className?: string;
}

const TimelineVariantContext = createContext<TimelineVariant>('stepper');

function useTimelineVariant(): TimelineVariant {
  return useContext(TimelineVariantContext);
}

function TimelineMarker({
  status,
  variant,
}: {
  status: TimelineItemStatus;
  variant: TimelineVariant;
}): React.JSX.Element {
  if (variant === 'log') {
    return <span className="nb-timeline__marker nb-timeline__marker--dot" aria-hidden="true" />;
  }

  if (status === 'complete') {
    return (
      <span className="nb-timeline__marker nb-timeline__marker--complete" aria-hidden="true">
        <i className="ph ph-check" />
      </span>
    );
  }

  if (status === 'current') {
    return <span className="nb-timeline__marker nb-timeline__marker--current" aria-hidden="true" />;
  }

  if (status === 'error') {
    return (
      <span className="nb-timeline__marker nb-timeline__marker--error" aria-hidden="true">
        <i className="ph ph-x" />
      </span>
    );
  }

  return <span className="nb-timeline__marker nb-timeline__marker--pending" aria-hidden="true" />;
}

export function TimelineItem({
  status,
  title,
  timestamp,
  dateTime,
  tone = 'default',
  children,
  className,
}: TimelineItemProps): React.JSX.Element {
  const variant = useTimelineVariant();

  const classes = [
    'nb-timeline__item',
    `nb-timeline__item--${status}`,
    variant === 'log' && `nb-timeline__item--tone-${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={classes}>
      <div className="nb-timeline__marker-col">
        <TimelineMarker status={status} variant={variant} />
      </div>
      <div className="nb-timeline__content">
        <div className="nb-timeline__heading">
          <span className="nb-timeline__label">{title}</span>
          {timestamp != null && timestamp !== '' && (
            <time className="nb-timeline__timestamp" dateTime={dateTime}>
              {timestamp}
            </time>
          )}
        </div>
        {children}
      </div>
    </li>
  );
}

export function Timeline({
  variant = 'stepper',
  orientation = 'vertical',
  title,
  description,
  children,
  className,
  'aria-label': ariaLabel,
}: TimelineProps): React.JSX.Element {
  // The log variant reads top-to-bottom by nature (newest first).
  const resolvedOrientation = variant === 'log' ? 'vertical' : orientation;

  const panelClasses = [
    'nb-timeline-panel',
    (title != null || description != null) && 'nb-timeline-panel--card',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <TimelineVariantContext.Provider value={variant}>
      <div className={panelClasses}>
        {(title != null || description != null) && (
          <header className="nb-timeline-panel__header">
            {title != null && <h3 className="nb-timeline-panel__title">{title}</h3>}
            {description != null && (
              <p className="nb-timeline-panel__description">{description}</p>
            )}
          </header>
        )}
        <ol
          className={`nb-timeline nb-timeline--${variant} nb-timeline--${resolvedOrientation}`}
          role="list"
          aria-label={ariaLabel}
        >
          {children}
        </ol>
      </div>
    </TimelineVariantContext.Provider>
  );
}