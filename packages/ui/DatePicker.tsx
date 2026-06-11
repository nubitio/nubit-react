import React, { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUiStrings } from './UiStrings';
import './DatePicker.scss';

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

type CalendarDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  disabled: boolean;
};

type ViewMode = 'days' | 'months' | 'years';

// ── Utilities ─────────────────────────────────────────────────────────────────

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const getLocale = (override?: string) => override || document.documentElement.lang || navigator.language || 'en-US';

const pad = (value: number) => String(value).padStart(2, '0');

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseIsoDate = (value?: string | null) => {
  if (!value || !ISO_DATE_RE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);

const formatDisplayDate = (value?: string | null, locale?: string) => {
  const date = parseIsoDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(getLocale(locale), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const formatMonthLabel = (date: Date, locale?: string) =>
  new Intl.DateTimeFormat(getLocale(locale), { month: 'long', year: 'numeric' }).format(date);

/**
 * Locale-aware first day of week.
 * Uses Intl.Locale.weekInfo (Chrome 99+, FF 126+, Safari 17+) with fallback heuristic.
 */
export const getFirstDayOfWeek = (locale?: string): number => {
  try {
    // @ts-expect-error — weekInfo is stage-4, not yet in TS lib
    const info = new Intl.Locale(getLocale(locale)).weekInfo;
    if (info && typeof info.firstDay === 'number') return info.firstDay === 7 ? 0 : info.firstDay;
  } catch { /* ignore */ }
  const country = (getLocale(locale).split('-')[1] ?? '').toUpperCase();
  const sundayCountries = ['US', 'CA', 'MX', 'CN', 'JP', 'KR', 'SA', 'EG', 'IL', 'BR'];
  return sundayCountries.includes(country) ? 0 : 1;
};

const buildCalendarDays = (month: Date, min?: string, max?: string, locale?: string): CalendarDay[] => {
  const first = startOfMonth(month);
  const firstDayOfWeek = getFirstDayOfWeek(locale);
  const offset = (first.getDay() - firstDayOfWeek + 7) % 7;
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);
  const start = new Date(first);
  start.setDate(first.getDate() - offset);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const iso = toIsoDate(date);
    return {
      date,
      iso,
      inCurrentMonth: date.getMonth() === month.getMonth(),
      disabled: Boolean((minDate && date < minDate) || (maxDate && date > maxDate)),
    };
  });
};

const isIsoDateDisabled = (iso: string, min?: string, max?: string) => {
  const date = parseIsoDate(iso);
  if (!date) return true;
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);
  return Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
};

export const weekDayLabels = (locale?: string): string[] => {
  const firstDayOfWeek = getFirstDayOfWeek(locale);
  const anchor = new Date(2026, 5, 7); // Known Sunday
  const formatter = new Intl.DateTimeFormat(getLocale(locale), { weekday: 'narrow' });
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + ((firstDayOfWeek + i) % 7));
    return formatter.format(date);
  });
};

/** Short month labels (Jan, Feb, …) — capitalized for display. */
const getMonthLabels = (locale?: string): string[] => {
  const formatter = new Intl.DateTimeFormat(getLocale(locale), { month: 'short' });
  return Array.from({ length: 12 }, (_, i) => {
    const label = formatter.format(new Date(2024, i, 1));
    return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
  });
};

/** Year range: 12-year block containing the given year. */
const getYearRangeStart = (year: number): number => Math.floor(year / 12) * 12;

// ── Text input mask ────────────────────────────────────────────────────────────

/**
 * Applies dd/mm/yyyy mask.
 * Auto-inserts trailing slash when adding the 2nd or 4th digit.
 * Does NOT add trailing slash when the user is deleting.
 */
export const applyDateMask = (rawValue: string, prevValue: string): string => {
  const digits = rawValue.replace(/\D/g, '').slice(0, 8);
  const prevDigits = prevValue.replace(/\D/g, '');
  const isAdding = digits.length > prevDigits.length;

  if (digits.length === 0) return '';

  let result = digits.slice(0, 2);
  if (digits.length > 2) result += '/' + digits.slice(2, 4);
  if (digits.length > 4) result += '/' + digits.slice(4, 8);

  // Auto-trailing slash only when actively typing the 2nd or 4th digit
  if (isAdding && (digits.length === 2 || digits.length === 4)) {
    result += '/';
  }

  return result;
};

/**
 * Parses dd/mm/yyyy or ISO yyyy-mm-dd to ISO string.
 * Returns null if not a valid date.
 */
export const parseDisplayDate = (text: string, locale?: string): string | null => {
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const [, a, b, year] = match;
    // Locale heuristic: US → mm/dd, rest → dd/mm
    const country = (getLocale(locale).split('-')[1] ?? '').toUpperCase();
    const monthFirst = country === 'US';
    const [dd, mm] = monthFirst ? [b, a] : [a, b];
    const iso = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    return parseIsoDate(iso) ? iso : null;
  }
  // Accept pasted ISO format
  if (ISO_DATE_RE.test(text)) return parseIsoDate(text) ? text : null;
  return null;
};

// ── Component ──────────────────────────────────────────────────────────────────

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    id,
    name,
    value,
    placeholder = 'dd/mm/yyyy',
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
  const strings = useUiStrings();

  const selectedDate = parseIsoDate(value);
  const resolvedLocale = getLocale(locale);
  const displayValue = formatDisplayDate(value, resolvedLocale);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [month, setMonth] = useState(() => startOfMonth(selectedDate ?? new Date()));
  const [yearRangeStart, setYearRangeStart] = useState(() => getYearRangeStart(new Date().getFullYear()));
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [focusedIso, setFocusedIso] = useState<string | null>(null);

  // ── Text input state ─────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const days = useMemo(() => buildCalendarDays(month, min, max, resolvedLocale), [max, min, month, resolvedLocale]);
  const weekdayLabels = useMemo(() => weekDayLabels(resolvedLocale), [resolvedLocale]);
  const monthLabels = useMemo(() => getMonthLabels(resolvedLocale), [resolvedLocale]);
  const selectedIso = selectedDate ? toIsoDate(selectedDate) : '';

  // ── Sync controlled value → month view ──────────────────────────────────
  useEffect(() => {
    if (selectedDate) setMonth(startOfMonth(selectedDate));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Panel positioning ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setFocusedIso(null);
      setViewMode('days');
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = panelRef.current?.offsetWidth ?? 296;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelWidth - 8);
      const top = Math.min(rect.bottom + 6, window.innerHeight - 380);
      setPanelStyle({ left, top: Math.max(8, top) });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  // ── Outside click / Escape ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        inputRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // ── Initial focus when calendar opens ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const initialIso = selectedDate ? toIsoDate(selectedDate) : toIsoDate(new Date());
    setFocusedIso(initialIso);
    window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${initialIso}"]`)?.focus();
    }, 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Commit helpers ───────────────────────────────────────────────────────
  const commitValue = useCallback((nextValue: string) => {
    onChange?.(nextValue);
    setOpen(false);
    setIsEditing(false);
    setInputText('');
    window.setTimeout(() => inputRef.current?.focus());
  }, [onChange]);

  const handleToday = useCallback(() => {
    const today = toIsoDate(new Date());
    if (isIsoDateDisabled(today, min, max)) return;
    setMonth(startOfMonth(parseIsoDate(today)!));
    commitValue(today);
  }, [min, max, commitValue]);

  const handleClear = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    commitValue('');
  }, [commitValue]);

  // ── Text input handlers ──────────────────────────────────────────────────
  const handleInputFocus = () => {
    setIsEditing(true);
    setInputText(displayValue);
    // Select all on focus so user can immediately retype
    window.setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || disabled) return;
    setInputText(applyDateMask(e.target.value, inputText));
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Ignore blur if focus moved within the component or to the panel
    const related = e.relatedTarget as Node | null;
    if (rootRef.current?.contains(related) || panelRef.current?.contains(related)) return;

    setIsEditing(false);
    const parsed = parseDisplayDate(inputText, resolvedLocale);
    if (parsed !== null) {
      if (parsed !== value) onChange?.(parsed);
    } else if (inputText === '' && value) {
      onChange?.('');
    }
    // Revert display to last committed value on invalid input
    setInputText('');
    onBlur?.(e);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseDisplayDate(inputText, resolvedLocale);
      if (parsed !== null) commitValue(parsed);
      else if (inputText === '') commitValue('');
    } else if (e.key === 'ArrowDown' || e.key === 'F4') {
      e.preventDefault();
      if (!readOnly && !disabled) setOpen(true);
    } else if (e.key === 'Escape' && open) {
      setOpen(false);
    }
  };

  const handleCalendarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // keep focus on the input
    if (readOnly || disabled) return;
    setOpen((v) => !v);
  };

  // ── Calendar keyboard navigation ─────────────────────────────────────────
  const handleDayKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, iso: string) => {
    const navKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '];
    if (!navKeys.includes(e.key)) return;
    e.preventDefault();

    if (e.key === 'Enter' || e.key === ' ') {
      const day = days.find((d) => d.iso === iso);
      if (day && !day.disabled) commitValue(iso);
      return;
    }

    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key] ?? 0;
    const current = parseIsoDate(iso);
    if (!current) return;
    const next = new Date(current);
    next.setDate(current.getDate() + delta);
    const nextIso = toIsoDate(next);

    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) {
      setMonth(startOfMonth(next));
    }
    setFocusedIso(nextIso);
    window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${nextIso}"]`)?.focus();
    }, 0);
  }, [days, month, commitValue]);

  // ── View: months ─────────────────────────────────────────────────────────
  const handleMonthSelect = (monthIndex: number) => {
    setMonth(new Date(month.getFullYear(), monthIndex, 1));
    setViewMode('days');
  };

  const handleYearSelect = (year: number) => {
    setMonth(new Date(year, month.getMonth(), 1));
    setViewMode('months');
  };

  // ── Ref forwarding ────────────────────────────────────────────────────────
  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const todayIso = toIsoDate(new Date());

  return (
    <div ref={rootRef} className={cx('nb-date-picker', className)}>
      <input type="hidden" name={name} value={value ?? ''} required={required} />

      {/* ── Trigger ── */}
      <div
        ref={triggerRef}
        className={cx(
          'nb-date-picker__trigger',
          invalid && 'nb-date-picker__trigger--invalid',
          readOnly && 'nb-date-picker__trigger--readonly',
          open && 'nb-date-picker__trigger--open',
          disabled && 'nb-date-picker__trigger--disabled',
        )}
      >
        <input
          ref={setInputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          className={cx('nb-date-picker__input', !isEditing && !displayValue && 'nb-date-picker__input--placeholder')}
          value={isEditing ? inputText : displayValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          autoComplete="off"
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
        />
        <span className="nb-date-picker__icons">
          {clearable && displayValue && !disabled && !readOnly && (
            <span
              role="button"
              tabIndex={-1}
              className="nb-date-picker__clear"
              aria-label={strings.clearDate}
              onPointerDown={handleClear}
            >
              <i className="ph ph-x" aria-hidden="true" />
            </span>
          )}
          <span
            role="button"
            tabIndex={-1}
            className="nb-date-picker__calendar-btn"
            aria-label={strings.openCalendar}
            onPointerDown={handleCalendarPointerDown}
          >
            <i className="ph ph-calendar-blank" aria-hidden="true" />
          </span>
        </span>
      </div>

      {/* ── Panel ── */}
      {open && createPortal(
        <div
          ref={panelRef}
          className="nb-date-picker__panel"
          role="dialog"
          aria-label={strings.selectDate}
          style={panelStyle}
        >
          {/* Days view */}
          {viewMode === 'days' && (
            <>
              <div className="nb-date-picker__header">
                <button type="button" className="nb-date-picker__nav" aria-label={strings.previousMonth} onClick={() => setMonth((m) => addMonths(m, -1))}>
                  <i className="ph ph-caret-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="nb-date-picker__month nb-date-picker__month--clickable"
                  aria-label={strings.selectMonthAndYear}
                  onClick={() => setViewMode('months')}
                >
                {formatMonthLabel(month, resolvedLocale)}
                  <i className="ph ph-caret-down nb-date-picker__month-caret" aria-hidden="true" />
                </button>
                <button type="button" className="nb-date-picker__nav" aria-label={strings.nextMonth} onClick={() => setMonth((m) => addMonths(m, 1))}>
                  <i className="ph ph-caret-right" aria-hidden="true" />
                </button>
              </div>
              <div className="nb-date-picker__weekdays" aria-hidden="true">
                {weekdayLabels.map((label, i) => <span key={`${label}-${i}`}>{label}</span>)}
              </div>
              <div className="nb-date-picker__days" role="grid" aria-label={formatMonthLabel(month, resolvedLocale)}>
                {days.map((day) => (
                  <button
                    key={day.iso}
                    data-iso={day.iso}
                    type="button"
                    className={cx(
                      'nb-date-picker__day',
                      !day.inCurrentMonth && 'nb-date-picker__day--muted',
                      day.iso === selectedIso && 'nb-date-picker__day--selected',
                      day.iso === todayIso && 'nb-date-picker__day--today',
                    )}
                    disabled={day.disabled}
                    role="gridcell"
                    aria-selected={day.iso === selectedIso}
                    tabIndex={day.iso === (focusedIso ?? selectedIso ?? todayIso) ? 0 : -1}
                    onClick={() => commitValue(day.iso)}
                    onKeyDown={(e) => handleDayKeyDown(e, day.iso)}
                  >
                    {day.date.getDate()}
                  </button>
                ))}
              </div>
              <div className="nb-date-picker__footer">
                <button type="button" className="nb-date-picker__text-button" onClick={() => commitValue('')}>{strings.clear}</button>
                <button type="button" className="nb-date-picker__text-button" onClick={handleToday}>{strings.today}</button>
              </div>
            </>
          )}

          {/* Months view */}
          {viewMode === 'months' && (
            <>
              <div className="nb-date-picker__header">
                <button type="button" className="nb-date-picker__nav" aria-label={strings.previousYear} onClick={() => setMonth((m) => new Date(m.getFullYear() - 1, m.getMonth(), 1))}>
                  <i className="ph ph-caret-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="nb-date-picker__month nb-date-picker__month--clickable"
                  aria-label={strings.selectYear}
                  onClick={() => {
                    setYearRangeStart(getYearRangeStart(month.getFullYear()));
                    setViewMode('years');
                  }}
                >
                  {month.getFullYear()}
                  <i className="ph ph-caret-down nb-date-picker__month-caret" aria-hidden="true" />
                </button>
                <button type="button" className="nb-date-picker__nav" aria-label={strings.nextYear} onClick={() => setMonth((m) => new Date(m.getFullYear() + 1, m.getMonth(), 1))}>
                  <i className="ph ph-caret-right" aria-hidden="true" />
                </button>
              </div>
              <div className="nb-date-picker__months-grid" role="grid" aria-label={`${month.getFullYear()}`}>
                {monthLabels.map((label, i) => {
                  const isSelected = selectedDate
                    ? selectedDate.getMonth() === i && selectedDate.getFullYear() === month.getFullYear()
                    : false;
                  const isCurrent = new Date().getMonth() === i && new Date().getFullYear() === month.getFullYear();
                  return (
                    <button
                      key={i}
                      type="button"
                      className={cx(
                        'nb-date-picker__month-cell',
                        isSelected && 'nb-date-picker__month-cell--selected',
                        isCurrent && 'nb-date-picker__month-cell--current',
                      )}
                      role="gridcell"
                      aria-selected={isSelected}
                      onClick={() => handleMonthSelect(i)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="nb-date-picker__footer">
                <button type="button" className="nb-date-picker__text-button" onClick={() => setViewMode('days')}>
                  <i className="ph ph-arrow-left" aria-hidden="true" /> {strings.back}
                </button>
              </div>
            </>
          )}

          {/* Years view */}
          {viewMode === 'years' && (
            <>
              <div className="nb-date-picker__header">
                <button type="button" className="nb-date-picker__nav" aria-label={strings.previousYears} onClick={() => setYearRangeStart((y) => y - 12)}>
                  <i className="ph ph-caret-left" aria-hidden="true" />
                </button>
                <div className="nb-date-picker__month">
                  {yearRangeStart}–{yearRangeStart + 11}
                </div>
                <button type="button" className="nb-date-picker__nav" aria-label={strings.nextYears} onClick={() => setYearRangeStart((y) => y + 12)}>
                  <i className="ph ph-caret-right" aria-hidden="true" />
                </button>
              </div>
              <div className="nb-date-picker__years-grid" role="grid" aria-label={`${yearRangeStart}–${yearRangeStart + 11}`}>
                {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((year) => {
                  const isSelected = selectedDate ? selectedDate.getFullYear() === year : false;
                  const isCurrent = new Date().getFullYear() === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      className={cx(
                        'nb-date-picker__year-cell',
                        isSelected && 'nb-date-picker__year-cell--selected',
                        isCurrent && 'nb-date-picker__year-cell--current',
                      )}
                      role="gridcell"
                      aria-selected={isSelected}
                      onClick={() => handleYearSelect(year)}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
              <div className="nb-date-picker__footer">
                <button type="button" className="nb-date-picker__text-button" onClick={() => setViewMode('months')}>
                  <i className="ph ph-arrow-left" aria-hidden="true" /> {strings.back}
                </button>
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
});
