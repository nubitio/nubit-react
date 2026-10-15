import React, { forwardRef } from 'react';
import { DateInput, DateSegment, I18nProvider, TimeField } from 'react-aria-components';
import { parseTime } from '@internationalized/date';
import { getDateLocale } from './dateValues';
import { useUiStrings } from './UiStrings';
import './TimePicker.scss';

export interface TimePickerProps {
  id?: string;
  name?: string;
  /** Wall-clock time, HH:mm (or HH:mm:ss with second granularity). */
  value?: string | null;
  onChange?: (value: string) => void;
  onBlur?: React.FocusEventHandler<Element>;
  min?: string;
  max?: string;
  locale?: string;
  hourCycle?: 12 | 24;
  granularity?: 'minute' | 'second';
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
}

const timeValue = (value?: string | null) => {
  if (!value) return null;
  try {
    return parseTime(value);
  } catch {
    return null;
  }
};

/** Accessible segmented time entry. Values never pass through Date or a timezone. */
export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(function TimePicker(
  {
    id,
    name,
    value,
    onChange,
    onBlur,
    min,
    max,
    locale,
    hourCycle,
    granularity = 'minute',
    disabled,
    readOnly,
    required,
    invalid,
    className,
    ariaLabel,
  },
  ref,
) {
  const strings = useUiStrings();
  return (
    <I18nProvider locale={getDateLocale(locale)}>
      <TimeField
        id={id}
        name={name}
        aria-label={ariaLabel ?? strings.selectTime}
        value={timeValue(value)}
        onChange={(next) =>
          onChange?.(next ? next.toString().slice(0, granularity === 'second' ? 8 : 5) : '')
        }
        onBlur={onBlur}
        minValue={timeValue(min) ?? undefined}
        maxValue={timeValue(max) ?? undefined}
        granularity={granularity}
        hourCycle={hourCycle}
        isDisabled={disabled}
        isReadOnly={readOnly}
        isRequired={required}
        isInvalid={invalid}
        validationBehavior="aria"
        className={['nb-time-picker', className].filter(Boolean).join(' ')}
      >
        <DateInput ref={ref} className="nb-time-picker__input">
          {(segment) => <DateSegment segment={segment} className="nb-time-picker__segment" />}
        </DateInput>
      </TimeField>
    </I18nProvider>
  );
});
