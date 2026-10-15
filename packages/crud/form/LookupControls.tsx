import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCoreTranslation, type DataRecord } from '@nubitio/core';
import { Field } from '../field/Field';

// ─── Shared lookup dropdown primitive ────────────────────────────────────────

// Custom event used to coordinate mutual exclusion between lookup dropdowns.
// When any dropdown opens it dispatches this event; all others close themselves.
const LOOKUP_OPENED_EVENT = 'lookup:opened';

function useLookupDropdown() {
  const [open, setOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<symbol>(Symbol());
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
    margin: 0,
  });

  const getPositionedMenuStyle = useCallback((): React.CSSProperties => {
    if (!containerRef.current) return { position: 'fixed', visibility: 'hidden', margin: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < 250 && spaceAbove > spaceBelow) {
      return {
        position: 'fixed',
        left: `${left}px`,
        width: `${rect.width}px`,
        bottom: `${window.innerHeight - rect.top + 4}px`,
        top: 'auto',
        margin: 0,
        zIndex: 9999,
        visibility: 'visible',
      };
    }

    return {
      position: 'fixed',
      left: `${left}px`,
      width: `${rect.width}px`,
      top: `${rect.bottom + 4}px`,
      bottom: 'auto',
      margin: 0,
      zIndex: 9999,
      visibility: 'visible',
    };
  }, []);

  // Note: IntersectionObserver was removed — it fired false positives during the
  // dialog-enter CSS animation (scale/translate transform causes the trigger to
  // briefly appear "off-screen"), causing entity dropdowns to blink.
  // The scroll listener in the positioning useLayoutEffect already handles
  // closing the panel when the trigger genuinely leaves the viewport.

  // MutationObserver: close when an ancestor becomes aria-hidden
  // (keepMounted dialog hiding itself with visibility:hidden).
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const container = containerRef.current;
    const checkAriaHidden = () => {
      let el: HTMLElement | null = container.parentElement;
      while (el) {
        if (el.getAttribute('aria-hidden') === 'true') {
          setOpen(false);
          return;
        }
        el = el.parentElement;
      }
    };
    const mo = new MutationObserver(checkAriaHidden);
    mo.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-hidden'],
      subtree: true,
    });
    return () => mo.disconnect();
  }, [open]);

  // Mutual exclusion: close when another lookup/actions dropdown opens.
  useEffect(() => {
    const id = idRef.current;
    const handler = (e: Event) => {
      if ((e as CustomEvent<{ id: symbol }>).detail.id !== id) setOpen(false);
    };
    document.addEventListener(LOOKUP_OPENED_EVENT, handler);
    return () => document.removeEventListener(LOOKUP_OPENED_EVENT, handler);
  }, []);

  // Broadcast: notify siblings when this dropdown transitions to open.
  // Kept in useLayoutEffect (not inside a state updater) to avoid the React
  // Strict Mode double-invocation of updater functions causing a double-dispatch.
  useLayoutEffect(() => {
    if (!open) return;
    document.dispatchEvent(
      new CustomEvent<{ id: symbol }>(LOOKUP_OPENED_EVENT, { detail: { id: idRef.current } }),
    );
  }, [open]);

  // Outside-click: close immediately on mousedown outside the trigger+panel.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
        setDraftQuery(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Position panel while open. Opening precomputes menuStyle before mounting
  // the portal, so we do not need a close-time reset render.
  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (
        rect.top >= window.innerHeight ||
        rect.bottom <= 0 ||
        rect.left >= window.innerWidth ||
        rect.right <= 0
      ) {
        setOpen(false);
        return;
      }
      setMenuStyle(getPositionedMenuStyle());
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, { capture: true });
    };
  }, [getPositionedMenuStyle, open]);

  const setOpenWithPosition = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof value === 'function' ? value(open) : value;
      if (next) setMenuStyle(getPositionedMenuStyle());
      setOpen(next);
    },
    [getPositionedMenuStyle, open],
  );

  return {
    open,
    setOpen: setOpenWithPosition,
    draftQuery,
    setDraftQuery,
    containerRef,
    menuRef,
    menuStyle,
  };
}

function LookupDropdown({
  activeOptionId,
  children,
  className,
  containerRef,
  disabled,
  id,
  label,
  menuRef,
  menuStyle,
  normalizedValue,
  onClear,
  onKeyDown,
  onQueryChange,
  onScroll,
  open,
  query,
  readOnly,
  required,
  setDraftQuery,
  setOpen,
}: {
  activeOptionId?: string;
  children: React.ReactNode;
  className: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  id?: string;
  label: string;
  menuRef: React.RefObject<HTMLDivElement | null>;
  menuStyle: React.CSSProperties;
  normalizedValue: string;
  onClear: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onQueryChange: (value: string) => void;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  open: boolean;
  query: string;
  readOnly?: boolean;
  required?: boolean;
  setDraftQuery: (q: string | null) => void;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const { t } = useCoreTranslation();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  return (
    <div
      ref={containerRef}
      className={`nb-form__lookup${normalizedValue !== '' ? ' has-value' : ''}`}
    >
      <input
        autoComplete="off"
        className={className}
        disabled={disabled}
        id={id}
        readOnly={readOnly}
        required={required}
        role="combobox"
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-expanded={open}
        value={query}
        onBlur={() => {
          // Keep blur timer only for keyboard (Tab) navigation; mouse outside-click
          // is handled by the document mousedown listener in useLookupDropdown.
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            setDraftQuery(null);
          }, 120);
        }}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        onFocus={() => {
          clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {!disabled && !readOnly && normalizedValue !== '' && (
        <button
          type="button"
          className="nb-form__lookup-clear"
          aria-label={t('form.lookupClear', { label })}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClear}
        >
          <i className="ph ph-x" aria-hidden="true" />
        </button>
      )}
      {!disabled && !readOnly && (
        <button
          type="button"
          className="nb-form__lookup-toggle"
          aria-label={t('form.lookupOpen', { label })}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            clearTimeout(blurTimer.current);
            setOpen((prev) => !prev);
          }}
        >
          <i
            className="ph ph-caret-down"
            aria-hidden="true"
            style={{
              transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      )}
      {open &&
        !disabled &&
        !readOnly &&
        createPortal(
          <div
            ref={menuRef}
            className="nb-form__lookup-menu"
            id={`${id}-listbox`}
            role="listbox"
            style={menuStyle}
            onScroll={onScroll}
            onMouseDown={(e) => e.preventDefault()}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── NativeEntitySelect ───────────────────────────────────────────────────────

export { NativeEntitySelect } from './EntityCombobox';

export function NativeEnumSelect({
  className,
  disabled,
  field,
  id,
  onChange,
  readOnly,
  required,
  value,
}: {
  className: string;
  disabled?: boolean;
  field: Field;
  id?: string;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  required?: boolean;
  value: unknown;
}) {
  const { t } = useCoreTranslation();
  const generatedId = useId();
  const { open, setOpen, draftQuery, setDraftQuery, containerRef, menuRef, menuStyle } =
    useLookupDropdown();
  const [activeIndex, setActiveIndex] = useState(0);

  const allItems: DataRecord[] = field.data ?? [];
  const normalizedValue = String(value ?? '');
  const selectedItem = allItems.find((item) => String(item['value'] ?? '') === normalizedValue);
  const selectedText = selectedItem
    ? String(selectedItem['text'] ?? selectedItem['value'] ?? '')
    : '';
  const query = draftQuery ?? selectedText;
  const visibleItems =
    draftQuery != null && draftQuery !== ''
      ? allItems.filter((item) =>
          String(item['text'] ?? item['value'] ?? '')
            .toLowerCase()
            .includes(draftQuery.toLowerCase()),
        )
      : allItems;
  const controlId = id ?? generatedId;
  const activeOptionIndex =
    visibleItems.length === 0 ? 0 : Math.min(activeIndex, visibleItems.length - 1);

  const selectItem = (item: DataRecord) => {
    onChange(item['value'] ?? null);
    setDraftQuery(null);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(0, Math.min(visibleItems.length - 1, current + 1)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === 'Enter' && open && visibleItems[activeOptionIndex]) {
      event.preventDefault();
      selectItem(visibleItems[activeOptionIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraftQuery(null);
      setOpen(false);
    }
  };

  return (
    <LookupDropdown
      activeOptionId={
        open && visibleItems[activeOptionIndex]
          ? `${controlId}-option-${String(visibleItems[activeOptionIndex]['value'] ?? '')}`
          : undefined
      }
      className={className}
      containerRef={containerRef}
      disabled={disabled}
      id={controlId}
      label={field.label}
      menuRef={menuRef}
      menuStyle={menuStyle}
      normalizedValue={normalizedValue}
      onClear={() => {
        setActiveIndex(0);
        onChange(null);
        setDraftQuery('');
        setOpen(true);
      }}
      onKeyDown={handleKeyDown}
      onQueryChange={(v) => {
        setActiveIndex(0);
        setDraftQuery(v);
        setOpen(true);
        if (v === '') onChange(null);
      }}
      open={open}
      query={query}
      readOnly={readOnly}
      required={required}
      setDraftQuery={setDraftQuery}
      setOpen={setOpen}
    >
      {visibleItems.length === 0 && (
        <div className="nb-form__lookup-status">{t('form.lookupNoResults')}</div>
      )}
      {visibleItems.map((item) => {
        const itemValue = String(item['value'] ?? '');
        const isActive = visibleItems[activeOptionIndex] === item;
        return (
          <button
            key={itemValue}
            id={`${controlId}-option-${itemValue}`}
            type="button"
            role="option"
            aria-selected={itemValue === normalizedValue}
            className={`nb-form__lookup-option${isActive ? ' is-active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectItem(item)}
          >
            {String(item['text'] ?? item['value'] ?? '')}
          </button>
        );
      })}
    </LookupDropdown>
  );
}
