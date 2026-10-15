import React, { forwardRef, useState } from 'react';
import { applyDateMask, dateAllowed, formatDate, parseDisplayDate } from './dateValues';

interface DateTextInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'min' | 'max'
> {
  value?: string | null;
  locale: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
  onOpen: () => void;
}
/** Keeps the real input/ref/ID contract used by CRUD forms. */
export const DateTextInput = forwardRef<HTMLInputElement, DateTextInputProps>(
  function DateTextInput(
    { value, locale, min, max, onChange, onOpen, onBlur, onKeyDown, ...props },
    ref,
  ) {
    const [draft, setDraft] = useState<string | null>(null);
    const commit = () => {
      if (draft === null) return;
      const iso = parseDisplayDate(draft.trim(), locale);
      if (!draft.trim()) onChange('');
      else if (iso && dateAllowed(iso, min, max)) onChange(iso);
      setDraft(null);
    };
    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        // React Aria's group press/navigation assumes segmented fields.
        // Keep native pointer focus, selection and caret movement in this adapter.
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        value={draft ?? formatDate(value, locale)}
        onChange={(event) => setDraft(applyDateMask(event.target.value, draft ?? '', locale))}
        onBlur={(event) => {
          commit();
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') event.stopPropagation();
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Escape') setDraft(null);
          if (event.key === 'ArrowDown' && !props.disabled && !props.readOnly) {
            event.preventDefault();
            commit();
            onOpen();
          }
        }}
      />
    );
  },
);
