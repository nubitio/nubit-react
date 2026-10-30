import React from 'react';
import {
  Button,
  DateRangePicker as AriaDateRangePicker,
  Group,
  I18nProvider,
  Popover,
  RangeCalendar,
} from 'react-aria-components';
import { getLocalTimeZone, today } from '@internationalized/date';
import { CalendarContent, CalendarDialog } from './CalendarContent';
import { DateTextInput } from './DateTextInput';
import { calendarDate, dateAllowed, datePlaceholder, getDateLocale } from './dateValues';
import { useCalendarPopover } from './useCalendarPopover';
import { useUiStrings } from './UiStrings';
import './DatePicker.scss';
import './DateRangePicker.scss';

export interface DateRangePickerProps {
  startValue?: string | null;
  endValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  readOnly?: boolean;
  required?: boolean;
  invalid?: boolean;
  locale?: string;
  min?: string;
  max?: string;
  className?: string;
  ariaLabel?: string;
  onChange?: (startValue: string, endValue: string) => void;
  onBlur?: React.FocusEventHandler<HTMLElement>;
}

export function DateRangePicker({
  startValue,
  endValue,
  placeholder,
  disabled = false,
  clearable = true,
  readOnly = false,
  required = false,
  invalid = false,
  locale,
  min,
  max,
  className,
  ariaLabel,
  onChange,
  onBlur,
}: DateRangePickerProps) {
  const { container, groupRef, panelRef, open, setOpen } = useCalendarPopover();
  const strings = useUiStrings();
  const resolvedLocale = getDateLocale(locale);
  const start = calendarDate(startValue);
  const end = calendarDate(endValue);
  const change = (a: string, b: string) => (a && b && a > b ? onChange?.(b, a) : onChange?.(a, b));
  const todayIso = today(getLocalTimeZone()).toString();
  const prefix = 'nb-date-range-picker';
  const inputProps = {
    locale: resolvedLocale,
    min,
    max,
    placeholder: placeholder ?? datePlaceholder(resolvedLocale),
    disabled,
    readOnly,
    required,
    'aria-invalid': invalid || undefined,
    className: `${prefix}__input`,
    onOpen: () => setOpen(true),
    onBlur,
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation();
        setOpen(false);
      }
    },
  };
  return (
    <I18nProvider locale={resolvedLocale}>
      <AriaDateRangePicker
        aria-label={ariaLabel ?? strings.selectDateRange}
        value={start && end && start.compare(end) <= 0 ? { start, end } : null}
        onChange={(range) => change(range?.start.toString() ?? '', range?.end.toString() ?? '')}
        minValue={calendarDate(min) ?? undefined}
        maxValue={calendarDate(max) ?? undefined}
        placeholderValue={start ?? end ?? undefined}
        isDisabled={disabled}
        isReadOnly={readOnly}
        isRequired={required}
        isInvalid={invalid}
        validationBehavior="aria"
        isOpen={open}
        onOpenChange={setOpen}
        className={[prefix, className].filter(Boolean).join(' ')}
      >
        <Group
          ref={groupRef}
          className={[
            `${prefix}__trigger`,
            disabled && `${prefix}__trigger--disabled`,
            readOnly && `${prefix}__trigger--readonly`,
            invalid && `${prefix}__trigger--invalid`,
            open && `${prefix}__trigger--open`,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <DateTextInput
            {...inputProps}
            aria-label={[strings.startDate, ariaLabel].filter(Boolean).join(' ')}
            value={startValue}
            onChange={(next) => change(next, endValue ?? '')}
          />
          <span className={`${prefix}__sep`} aria-hidden="true">
            →
          </span>
          <DateTextInput
            {...inputProps}
            aria-label={[strings.endDate, ariaLabel].filter(Boolean).join(' ')}
            value={endValue}
            onChange={(next) => change(startValue ?? '', next)}
          />
          {clearable && (startValue || endValue) && !disabled && !readOnly && (
            <Button
              slot={null}
              className={`${prefix}__clear`}
              aria-label={strings.clearDateRange}
              onPress={() => change('', '')}
            >
              ×
            </Button>
          )}
          <Button
            className={`${prefix}__calendar-btn`}
            aria-label={strings.openCalendar}
            onPress={() => groupRef.current?.querySelector('input')?.focus()}
            isDisabled={disabled || readOnly}
          >
            <i aria-hidden="true" className="ph ph-calendar-blank" />
          </Button>
        </Group>
        <Popover
          isNonModal={Boolean(container)}
          ref={panelRef}
          UNSTABLE_portalContainer={container ?? undefined}
          className={`${prefix}__panel`}
          offset={4}
        >
          <CalendarDialog ariaLabel={strings.selectDateRange}>
            <RangeCalendar className="nb-calendar--range">
              <CalendarContent />
            </RangeCalendar>
            <div className={`${prefix}__footer`}>
              <Button
                slot={null}
                className={`${prefix}__text-button`}
                onPress={() => {
                  change('', '');
                  setOpen(false);
                }}
              >
                {strings.clear}
              </Button>
              <Button
                slot={null}
                className={`${prefix}__text-button`}
                isDisabled={!dateAllowed(todayIso, min, max)}
                onPress={() => {
                  change(todayIso, todayIso);
                  setOpen(false);
                }}
              >
                {strings.today}
              </Button>
            </div>
          </CalendarDialog>
        </Popover>
      </AriaDateRangePicker>
    </I18nProvider>
  );
}
