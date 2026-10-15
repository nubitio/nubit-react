import React, { forwardRef, useId } from 'react';
import {
  Button,
  Calendar,
  DatePicker as AriaDatePicker,
  Group,
  I18nProvider,
  Popover,
} from 'react-aria-components';
import { getLocalTimeZone, today } from '@internationalized/date';
import { CalendarContent, CalendarDialog } from './CalendarContent';
import { DateTextInput } from './DateTextInput';
import { calendarDate, dateAllowed, datePlaceholder, getDateLocale } from './dateValues';
import { useCalendarPopover } from './useCalendarPopover';
import { useUiStrings } from './UiStrings';
import './DatePicker.scss';

export { applyDateMask, getFirstDayOfWeek, parseDisplayDate, weekDayLabels } from './dateValues';

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string | null;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  invalid?: boolean;
  locale?: string;
  /** Show the inline ✕ clear button when a value is present. Default: true.
   *  Set to false when the parent (e.g. datagrid filter row) already provides its own clear action. */
  clearable?: boolean;
  min?: string;
  max?: string;
  className?: string;
  ariaLabel?: string;
  onChange?: (value: string) => void;
  onBlur?: React.FocusEventHandler<HTMLElement>;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    id,
    name,
    value,
    placeholder,
    disabled = false,
    readOnly = false,
    required = false,
    invalid = false,
    clearable = true,
    locale,
    min,
    max,
    className,
    ariaLabel,
    onChange,
    onBlur,
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const { container, groupRef, panelRef, open, setOpen } = useCalendarPopover();
  const strings = useUiStrings();
  const resolvedLocale = getDateLocale(locale);
  const change = (next: string) => onChange?.(next);
  const todayIso = today(getLocalTimeZone()).toString();
  const prefix = 'nb-date-picker';
  return (
    <I18nProvider locale={resolvedLocale}>
      <AriaDatePicker
        aria-label={ariaLabel ?? strings.selectDate}
        value={calendarDate(value)}
        onChange={(date) => change(date?.toString() ?? '')}
        minValue={calendarDate(min) ?? undefined}
        maxValue={calendarDate(max) ?? undefined}
        isDisabled={disabled}
        isReadOnly={readOnly}
        isRequired={required}
        isInvalid={invalid}
        validationBehavior="aria"
        isOpen={open}
        onOpenChange={setOpen}
        className={[prefix, className].filter(Boolean).join(' ')}
      >
        <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />
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
            ref={ref}
            id={inputId}
            value={value}
            locale={resolvedLocale}
            min={min}
            max={max}
            placeholder={placeholder ?? datePlaceholder(resolvedLocale)}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            aria-label={ariaLabel ?? (id ? undefined : strings.selectDate)}
            aria-invalid={invalid || undefined}
            role="combobox"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? `${inputId}-panel` : undefined}
            className={`${prefix}__input`}
            onChange={change}
            onOpen={() => setOpen(true)}
            onBlur={onBlur}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && open) {
                event.stopPropagation();
                setOpen(false);
              }
            }}
          />
          {clearable && value && !disabled && !readOnly && (
            <Button
              slot={null}
              className={`${prefix}__clear`}
              aria-label={strings.clearDate}
              onPress={() => change('')}
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
          <CalendarDialog id={`${inputId}-panel`} ariaLabel={strings.selectDate}>
            <Calendar>
              <CalendarContent />
            </Calendar>
            <div className={`${prefix}__footer`}>
              <Button
                slot={null}
                className={`${prefix}__text-button`}
                onPress={() => {
                  change('');
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
                  change(todayIso);
                  setOpen(false);
                }}
              >
                {strings.today}
              </Button>
            </div>
          </CalendarDialog>
        </Popover>
      </AriaDatePicker>
    </I18nProvider>
  );
});
