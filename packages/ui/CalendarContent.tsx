import React from 'react';
import {
  Button,
  Dialog,
  CalendarCell,
  CalendarGrid,
  CalendarGridHeader,
  CalendarGridBody,
  CalendarHeaderCell,
  CalendarMonthPicker,
  CalendarYearPicker,
  Heading,
} from 'react-aria-components';
import { useUiStrings } from './UiStrings';
import { useOverlayContainer } from './OverlayContainer';
import './CalendarContent.scss';

/** Shared presentation; React Aria owns navigation, focus and range preview. */
export function CalendarContent() {
  const strings = useUiStrings();
  return (
    <>
      <header className="nb-calendar__header">
        <Button slot="previous" className="nb-date-picker__nav" aria-label={strings.previousMonth}>
          ‹
        </Button>
        <div className="nb-calendar__selectors">
          <Heading className="nb-calendar__heading" />
          <CalendarMonthPicker>
            {({ items, value, onChange, ...props }) => (
              <select
                {...props}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.formatted}
                  </option>
                ))}
              </select>
            )}
          </CalendarMonthPicker>
          <CalendarYearPicker>
            {({ items, value, onChange, ...props }) => (
              <select
                {...props}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.formatted}
                  </option>
                ))}
              </select>
            )}
          </CalendarYearPicker>
        </div>
        <Button slot="next" className="nb-date-picker__nav" aria-label={strings.nextMonth}>
          ›
        </Button>
      </header>
      <CalendarGrid className="nb-calendar__grid">
        <CalendarGridHeader>
          {(day) => <CalendarHeaderCell className="nb-calendar__weekday">{day}</CalendarHeaderCell>}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date) => <CalendarCell date={date} className="nb-calendar__day" />}
        </CalendarGridBody>
      </CalendarGrid>
    </>
  );
}

/** A parent modal owns containment; a standalone picker needs its own focus scope. */
export function CalendarDialog({
  id,
  ariaLabel,
  children,
}: {
  id?: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const container = useOverlayContainer();
  return container ? (
    <section id={id} aria-label={ariaLabel} role="dialog" tabIndex={-1}>
      {children}
    </section>
  ) : (
    <Dialog id={id} aria-label={ariaLabel}>
      {children}
    </Dialog>
  );
}
