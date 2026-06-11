/**
 * DateRangePicker — enterprise date range selector.
 *
 * A single trigger with two text inputs (start + end) sharing one calendar
 * panel. Supports hover-preview, range highlighting, keyboard entry, min/max
 * constraints, and full density/theme token compliance.
 *
 * Usage:
 *   <DateRangePicker
 *     startValue="2026-06-01"
 *     endValue="2026-06-30"
 *     onChange={(start, end) => ...}
 *   />
 */
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  applyDateMask,
  getFirstDayOfWeek,
  parseDisplayDate,
  weekDayLabels,
} from './DatePicker';
import { useUiStrings } from './UiStrings';
import './DateRangePicker.scss';

export interface DateRangePickerProps {
  startValue?: string | null;
  endValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
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

// ── Re-exported utilities from DatePicker ────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (v: number) => String(v).padStart(2, '0');
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseIsoDate = (value?: string | null) => {
  if (!value || !ISO_DATE_RE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
};

const cx = (...vals: Array<string | false | null | undefined>) => vals.filter(Boolean).join(' ');

const getLocale = (override?: string) => override || document.documentElement.lang || navigator.language || 'en-US';

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1);

const formatDisplayDate = (value?: string | null, locale?: string) => {
  const date = parseIsoDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(getLocale(locale), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const formatMonthLabel = (date: Date, locale?: string) =>
  new Intl.DateTimeFormat(getLocale(locale), { month: 'long', year: 'numeric' }).format(date);

type RangeDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  disabled: boolean;
};

const buildCalendarDays = (month: Date, min?: string, max?: string, locale?: string): RangeDay[] => {
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

// ── Range classification helpers ──────────────────────────────────────────────

type DayRoleInRange = 'start' | 'end' | 'in-range' | 'single' | 'none';

const getDayRoleInRange = (
  iso: string,
  startIso: string | null,
  endIso: string | null,
): DayRoleInRange => {
  if (!startIso) return 'none';
  if (!endIso || startIso === endIso) return iso === startIso ? 'single' : 'none';
  if (iso === startIso) return 'start';
  if (iso === endIso) return 'end';
  if (iso > startIso && iso < endIso) return 'in-range';
  return 'none';
};

// ── Component ─────────────────────────────────────────────────────────────────

type SelectionPhase = 'idle' | 'selecting-end';

export function DateRangePicker({
  startValue,
  endValue,
  placeholder = 'dd/mm/yyyy',
  disabled = false,
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
  const startId = useId();
  const endId = useId();
  const strings = useUiStrings();

  // ── Derived display values ────────────────────────────────────────────────
  const resolvedLocale = getLocale(locale);
  const startDisplay = formatDisplayDate(startValue, resolvedLocale);
  const endDisplay = formatDisplayDate(endValue, resolvedLocale);
  const startIso = parseIsoDate(startValue) ? (startValue as string) : null;
  const endIso = parseIsoDate(endValue) ? (endValue as string) : null;
  const hasRange = Boolean(startIso && endIso);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<SelectionPhase>('idle');
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverIso, setHoverIso] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(parseIsoDate(startValue) ?? new Date()));
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  // ── Text input state ──────────────────────────────────────────────────────
  const [startText, setStartText] = useState('');
  const [endText, setEndText] = useState('');
  const [editingField, setEditingField] = useState<'start' | 'end' | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const startInputRef = useRef<HTMLInputElement | null>(null);
  const endInputRef = useRef<HTMLInputElement | null>(null);

  const days = useMemo(() => buildCalendarDays(month, min, max, resolvedLocale), [month, min, max, resolvedLocale]);
  const weekdayLbls = useMemo(() => weekDayLabels(resolvedLocale), [resolvedLocale]);
  const todayIso = toIsoDate(new Date());

  // ── Sync controlled values → month ────────────────────────────────────────
  useEffect(() => {
    const anchor = parseIsoDate(startValue) ?? parseIsoDate(endValue);
    if (anchor) setMonth(startOfMonth(anchor));
  }, [startValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Panel positioning ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = panelRef.current?.offsetWidth ?? 296;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelWidth - 8);
      const top = Math.min(rect.bottom + 6, window.innerHeight - 380);
      setPanelStyle({ left, top: Math.max(8, top) });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const closePanel = useCallback(() => {
    setOpen(false);
    setPhase('idle');
    setPendingStart(null);
    setHoverIso(null);
  }, []);

  // ── Outside click / Escape ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      closePanel();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
        startInputRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closePanel]);

  const commitRange = useCallback((start: string, end: string) => {
    // Normalize: ensure start <= end
    const [a, b] = start <= end ? [start, end] : [end, start];
    onChange?.(a, b);
    closePanel();
    window.setTimeout(() => startInputRef.current?.focus());
  }, [onChange, closePanel]);

  // ── Calendar day click (two-phase selection) ──────────────────────────────
  const handleDayClick = useCallback((iso: string) => {
    if (phase === 'idle') {
      // First click → set start, wait for end
      setPendingStart(iso);
      setPhase('selecting-end');
    } else {
      // Second click → commit range
      const start = pendingStart ?? iso;
      commitRange(start, iso);
    }
  }, [phase, pendingStart, commitRange]);

  // ── Range visual state for each day ──────────────────────────────────────
  const getEffectiveRange = (): { effectiveStart: string | null; effectiveEnd: string | null } => {
    if (phase === 'selecting-end' && pendingStart) {
      const effectiveEnd = hoverIso ?? null;
      return {
        effectiveStart: pendingStart <= (effectiveEnd ?? pendingStart) ? pendingStart : effectiveEnd,
        effectiveEnd: pendingStart <= (effectiveEnd ?? pendingStart) ? effectiveEnd : pendingStart,
      };
    }
    return { effectiveStart: startIso, effectiveEnd: endIso };
  };

  const { effectiveStart, effectiveEnd } = getEffectiveRange();

  // ── Text input handlers ───────────────────────────────────────────────────
  const handleStartFocus = () => {
    setEditingField('start');
    setStartText(startDisplay);
    window.setTimeout(() => startInputRef.current?.select(), 0);
  };

  const handleEndFocus = () => {
    setEditingField('end');
    setEndText(endDisplay);
    window.setTimeout(() => endInputRef.current?.select(), 0);
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || disabled) return;
    setStartText(applyDateMask(e.target.value, startText));
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || disabled) return;
    setEndText(applyDateMask(e.target.value, endText));
  };

  const commitTextInput = (field: 'start' | 'end', text: string) => {
    const parsed = parseDisplayDate(text, resolvedLocale);
    if (parsed !== null) {
      const newStart = field === 'start' ? parsed : (startIso ?? '');
      const newEnd = field === 'end' ? parsed : (endIso ?? '');
      if (newStart && newEnd) {
        const [a, b] = newStart <= newEnd ? [newStart, newEnd] : [newEnd, newStart];
        onChange?.(a, b);
      } else if (field === 'start') {
        onChange?.(parsed, endIso ?? '');
      } else {
        onChange?.(startIso ?? '', parsed);
      }
    } else if (text === '') {
      if (field === 'start') onChange?.('', endIso ?? '');
      else onChange?.(startIso ?? '', '');
    }
  };

  const handleStartBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const related = e.relatedTarget as Node | null;
    if (rootRef.current?.contains(related) || panelRef.current?.contains(related)) return;
    commitTextInput('start', startText);
    setEditingField(null);
    setStartText('');
    onBlur?.(e);
  };

  const handleEndBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const related = e.relatedTarget as Node | null;
    if (rootRef.current?.contains(related) || panelRef.current?.contains(related)) return;
    commitTextInput('end', endText);
    setEditingField(null);
    setEndText('');
    onBlur?.(e);
  };

  const handleStartKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseDisplayDate(startText);
      if (parsed) { onChange?.(parsed, endIso ?? ''); }
      endInputRef.current?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'F4') {
      e.preventDefault();
      if (!readOnly && !disabled) setOpen(true);
    }
  };

  const handleEndKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parsed = parseDisplayDate(endText);
      if (parsed) { onChange?.(startIso ?? '', parsed); }
    } else if (e.key === 'ArrowDown' || e.key === 'F4') {
      e.preventDefault();
      if (!readOnly && !disabled) setOpen(true);
    }
  };

  const handleCalendarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (readOnly || disabled) return;
    setOpen((v) => !v);
  };

  const handleClear = (e: React.PointerEvent) => {
    e.preventDefault();
    onChange?.('', '');
    closePanel();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={rootRef} className={cx('nb-date-range-picker', className)}>

      {/* ── Trigger ── */}
      <div
        ref={triggerRef}
        className={cx(
          'nb-date-range-picker__trigger',
          invalid && 'nb-date-range-picker__trigger--invalid',
          readOnly && 'nb-date-range-picker__trigger--readonly',
          open && 'nb-date-range-picker__trigger--open',
          disabled && 'nb-date-range-picker__trigger--disabled',
        )}
        aria-label={ariaLabel}
      >
        {/* Start input */}
        <input
          ref={startInputRef}
          id={startId}
          type="text"
          inputMode="numeric"
          className={cx(
            'nb-date-range-picker__input',
            !editingField && !startDisplay && 'nb-date-range-picker__input--placeholder',
          )}
          value={editingField === 'start' ? startText : startDisplay}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete="off"
          aria-label={`Fecha inicio${ariaLabel ? ` ${ariaLabel}` : ''}`}
          aria-required={required || undefined}
          onFocus={handleStartFocus}
          onBlur={handleStartBlur}
          onChange={handleStartChange}
          onKeyDown={handleStartKeyDown}
        />

        {/* Separator */}
        <span className="nb-date-range-picker__sep" aria-hidden="true">
          <i className="ph ph-arrow-right" />
        </span>

        {/* End input */}
        <input
          ref={endInputRef}
          id={endId}
          type="text"
          inputMode="numeric"
          className={cx(
            'nb-date-range-picker__input',
            !editingField && !endDisplay && 'nb-date-range-picker__input--placeholder',
          )}
          value={editingField === 'end' ? endText : endDisplay}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete="off"
          aria-label={`Fecha fin${ariaLabel ? ` ${ariaLabel}` : ''}`}
          onFocus={handleEndFocus}
          onBlur={handleEndBlur}
          onChange={handleEndChange}
          onKeyDown={handleEndKeyDown}
        />

        {/* Trailing actions */}
        <span className="nb-date-range-picker__icons">
          {(startDisplay || endDisplay) && !disabled && !readOnly && (
            <span
              role="button"
              tabIndex={-1}
              className="nb-date-range-picker__clear"
              aria-label={strings.clearDateRange}
              onPointerDown={handleClear}
            >
              <i className="ph ph-x" aria-hidden="true" />
            </span>
          )}
          <span
            role="button"
            tabIndex={-1}
            className="nb-date-range-picker__calendar-btn"
            aria-label={strings.openCalendar}
            onPointerDown={handleCalendarPointerDown}
          >
            <i className="ph ph-calendar-blank" aria-hidden="true" />
          </span>
        </span>
      </div>

      {/* Phase indicator while selecting end */}
      {phase === 'selecting-end' && (
        <div className="nb-date-range-picker__hint" role="status" aria-live="polite">
          Selecciona la fecha de fin
        </div>
      )}

      {/* ── Panel ── */}
      {open && createPortal(
        <div
          ref={panelRef}
          className="nb-date-range-picker__panel"
          role="dialog"
          aria-label={strings.selectDateRange}
          style={panelStyle}
        >
          {/* Header */}
          <div className="nb-date-range-picker__header">
            <button
              type="button"
              className="nb-date-range-picker__nav"
              aria-label={strings.previousMonth}
              onClick={() => setMonth((m) => addMonths(m, -1))}
            >
              <i className="ph ph-caret-left" aria-hidden="true" />
            </button>
            <div className="nb-date-range-picker__month" aria-live="polite">
              {formatMonthLabel(month, resolvedLocale)}
            </div>
            <button
              type="button"
              className="nb-date-range-picker__nav"
              aria-label={strings.nextMonth}
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              <i className="ph ph-caret-right" aria-hidden="true" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="nb-date-range-picker__weekdays" aria-hidden="true">
            {weekdayLbls.map((label, i) => <span key={`${label}-${i}`}>{label}</span>)}
          </div>

          {/* Phase banner */}
          {phase === 'selecting-end' && (
            <div className="nb-date-range-picker__phase-banner">
              <i className="ph ph-info" aria-hidden="true" />
              Ahora selecciona la fecha de fin
            </div>
          )}

          {/* Day grid */}
          <div
            className="nb-date-range-picker__days"
            role="grid"
            aria-label={formatMonthLabel(month, resolvedLocale)}
          >
            {days.map((day) => {
              const role = getDayRoleInRange(day.iso, effectiveStart, effectiveEnd);
              return (
                <button
                  key={day.iso}
                  type="button"
                  className={cx(
                    'nb-date-range-picker__day',
                    !day.inCurrentMonth && 'nb-date-range-picker__day--muted',
                    day.iso === todayIso && 'nb-date-range-picker__day--today',
                    role === 'start' && 'nb-date-range-picker__day--range-start',
                    role === 'end' && 'nb-date-range-picker__day--range-end',
                    role === 'in-range' && 'nb-date-range-picker__day--in-range',
                    role === 'single' && 'nb-date-range-picker__day--range-single',
                    phase === 'selecting-end' && 'nb-date-range-picker__day--selecting',
                  )}
                  disabled={day.disabled}
                  role="gridcell"
                  aria-selected={role !== 'none'}
                  onMouseEnter={() => phase === 'selecting-end' && setHoverIso(day.iso)}
                  onMouseLeave={() => phase === 'selecting-end' && setHoverIso(null)}
                  onClick={() => !day.disabled && handleDayClick(day.iso)}
                >
                  <span className="nb-date-range-picker__day-inner">{day.date.getDate()}</span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="nb-date-range-picker__footer">
            <button
              type="button"
              className="nb-date-range-picker__text-button"
              onClick={() => { onChange?.('', ''); closePanel(); }}
            >
              {strings.clear}
            </button>
            {phase === 'selecting-end' ? (
              <button
                type="button"
                className="nb-date-range-picker__text-button"
                onClick={() => { setPendingStart(null); setPhase('idle'); setHoverIso(null); }}
              >
                {strings.cancel}
              </button>
            ) : (
              <button
                type="button"
                className="nb-date-range-picker__text-button"
                onClick={() => {
                  const today = toIsoDate(new Date());
                  setMonth(startOfMonth(new Date()));
                  if (!startIso) { onChange?.(today, endIso ?? ''); }
                  else if (!endIso) { onChange?.(startIso, today); }
                  else { onChange?.(today, today); }
                  closePanel();
                }}
              >
                {strings.today}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
