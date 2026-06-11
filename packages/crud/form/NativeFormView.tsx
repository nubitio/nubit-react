import './NativeFormView.scss';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { DatePicker, IconButton } from '@nubitio/ui';

import { useCoreHttpClient, useCoreRuntime, useEvents, getCoreLocale, getCoreTimezone, useCoreTranslation, type CoreHttpClient, type CoreTranslationKeys } from '@nubitio/core';
import { Field, type FieldButton } from '../field/Field';
import { FieldType } from '../field/FieldType';
import type { DataRecord } from '@nubitio/core';
import { type ResourceStore, type ResourceStoreFactory, useResourceStoreFactory } from '../data/ResourceStore';
import { FORM_ERRORS_EVENT, FORM_EVENTS } from './FormEvents';
import { buildEmptyRow, normalizeFormData, type PrependDataMap } from './FormDataTransform';
import { safeRandomId } from './safeRandomId';
import { buildFormLayoutModel, type FormLayoutGroup, type FormLayoutModel } from './FormLayoutModel';
import {
  buildFieldColSpanContext,
  resolveFieldsColSpans,
  type ColSpan,
  type FieldColSpanContext,
} from './resolveFieldColSpan';
import type { FormDataRecord } from './FormDataSnapshot';
import type { FormHandle } from './FormHandle';
import type { FormViewOptions } from './FormViewOptions';
import { useFormSubmit } from './useFormSubmit';
import { useFormValidation } from './useFormValidation';
import type { UploadedFile } from './UploadedFile';
import { FileUploadField, isUploadableFileField } from './FileUploadField';
import { type DetailFieldErrors, mapApiViolations } from './FormApiViolations';
import { resolveSummaryText, type DetailSummaryOptions } from '../summary';

type FieldState = { readonly?: boolean; disabled?: boolean; hidden?: boolean; validationEnabled?: boolean };
type EventRowPayload = FormDataRecord & { row?: FormDataRecord };

function createRemoteSource(
  field: Field,
  httpClient: CoreHttpClient,
  resourceStoreFactory: ResourceStoreFactory,
  prependData?: FormDataRecord[],
): ResourceStore {
  const options = prependData?.length
    ? [{ prependData }, ...field.loadOptions]
    : field.loadOptions;
  return resourceStoreFactory({
    url: field.url ?? '',
    idField: field.valueField,
    byKeyUrl: field.byKeyUrl,
    defaultFilterRules: fieldFilters(field),
    options,
    iriMode: field.valueField === '_iri',
    httpClient,
  });
}

function fieldKeyValue(field: Field, item: DataRecord): unknown {
  if (field.valueField === '_iri') return item['_iri'] ?? item['@id'] ?? item['id'];
  return item[field.valueField] ?? item['value'] ?? item['id'] ?? item['@id'];
}

function fieldTextValue(field: Field, item: DataRecord): string {
  const value = item[field.textField] ?? item['text'] ?? item['name'] ?? item['businessName'];
  return value == null ? '' : String(value);
}

function fieldFilters(field: Field): unknown[][] | undefined {
  if (field.filters.length === 0) return undefined;
  return field.filters.map((filter) => [filter.field, filter.operator, filter.value]);
}

function inputValue(value: unknown): string | number | readonly string[] | undefined {
  if (value instanceof Date) return value.toLocaleDateString('en-CA', { timeZone: getCoreTimezone() });
  if (typeof value === 'string' || typeof value === 'number') return value;
  return value == null ? '' : String(value);
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function fieldSearchExpr(field: Field): string[] {
  if (field.searchExpr && field.searchExpr.length > 0) return field.searchExpr;
  return [field.textField].filter(Boolean);
}

function colSpanStyle(span: ColSpan): React.CSSProperties {
  return { '--nb-form-col': String(span) } as React.CSSProperties;
}

function useViewportWidth(): number | undefined {
  const [width, setWidth] = useState<number | undefined>(() =>
    typeof window !== 'undefined' ? window.innerWidth : undefined,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return width;
}

type FieldButtonFormApi = Pick<FormHandle, 'getFieldValue' | 'setFieldValue'>;

const FIELD_BUTTON_ICONS: Record<string, string> = {
  search: 'ph ph-magnifying-glass',
  add: 'ph ph-plus',
  clear: 'ph ph-x',
};

function resolveButtonIcon(icon?: string): string {
  if (!icon) return 'ph ph-magnifying-glass';
  if (icon.startsWith('ph ')) return icon;
  if (icon.startsWith('ph-')) return `ph ${icon}`;
  return FIELD_BUTTON_ICONS[icon] ?? 'ph ph-magnifying-glass';
}

function resolveTabIcon(icon?: string): string | undefined {
  if (!icon) return undefined;
  if (icon.startsWith('ph ')) return icon;
  if (icon.startsWith('ph-')) return `ph ${icon}`;
  return `ph ph-${icon}`;
}

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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ position: 'fixed', visibility: 'hidden', margin: 0 });

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
        if (el.getAttribute('aria-hidden') === 'true') { setOpen(false); return; }
        el = el.parentElement;
      }
    };
    const mo = new MutationObserver(checkAriaHidden);
    mo.observe(document.body, { attributes: true, attributeFilter: ['aria-hidden'], subtree: true });
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
    document.dispatchEvent(new CustomEvent<{ id: symbol }>(LOOKUP_OPENED_EVENT, { detail: { id: idRef.current } }));
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
      if (rect.top >= window.innerHeight || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.right <= 0) { setOpen(false); return; }
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

  const setOpenWithPosition = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(open) : value;
    if (next) setMenuStyle(getPositionedMenuStyle());
    setOpen(next);
  }, [getPositionedMenuStyle, open]);

  return { open, setOpen: setOpenWithPosition, draftQuery, setDraftQuery, containerRef, menuRef, menuStyle };
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
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  return (
    <div ref={containerRef} className={`nb-form__lookup${normalizedValue !== '' ? ' has-value' : ''}`}>
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
          blurTimer.current = setTimeout(() => { setOpen(false); setDraftQuery(null); }, 120);
        }}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        onFocus={() => { clearTimeout(blurTimer.current); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {!disabled && !readOnly && normalizedValue !== '' && (
        <button type="button" className="nb-form__lookup-clear" aria-label={`Limpiar ${label}`} onMouseDown={(e) => e.preventDefault()} onClick={onClear}>
          <i className="ph ph-x" aria-hidden="true" />
        </button>
      )}
      {!disabled && !readOnly && (
        <button type="button" className="nb-form__lookup-toggle" aria-label={`Abrir ${label}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { clearTimeout(blurTimer.current); setOpen((prev) => !prev); }}>
          <i className="ph ph-caret-down" aria-hidden="true" style={{ transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>
      )}
      {open && !disabled && !readOnly && createPortal(
        <div ref={menuRef} className="nb-form__lookup-menu" id={`${id}-listbox`} role="listbox" style={menuStyle} onScroll={onScroll} onMouseDown={(e) => e.preventDefault()}>
          {children}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── NativeEntitySelect ───────────────────────────────────────────────────────

export function NativeEntitySelect({
  className,
  disabled,
  field,
  httpClient,
  id,
  onChange,
  options,
  prependData,
  readOnly,
  required,
  value,
}: {
  className: string;
  disabled?: boolean;
  field: Field;
  httpClient: CoreHttpClient;
  id?: string;
  onChange: (value: unknown, item?: DataRecord | null) => void;
  options: DataRecord[];
  prependData?: FormDataRecord[];
  readOnly?: boolean;
  required?: boolean;
  value: unknown;
}) {
  const { t } = useCoreTranslation();
  const generatedId = useId();
  const resourceStoreFactory = useResourceStoreFactory();
  const { open, setOpen, draftQuery, setDraftQuery, containerRef, menuRef, menuStyle } = useLookupDropdown();
  const [searchedItems, setSearchedItems] = useState<DataRecord[] | null>(null);
  const [selectedItemCache, setSelectedItemCache] = useState<DataRecord | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const normalizedValue = String(value && typeof value === 'object' ? fieldKeyValue(field, value as DataRecord) : value ?? '');
  const items = searchedItems ?? options;
  const objectValue = value && typeof value === 'object' ? value as DataRecord : null;
  const cachedSelectedItem = selectedItemCache && String(fieldKeyValue(field, selectedItemCache) ?? '') === normalizedValue ? selectedItemCache : undefined;
  const objectSelectedItem = objectValue && String(fieldKeyValue(field, objectValue) ?? '') === normalizedValue ? objectValue : undefined;
  const selectedItem = items.find((item) => String(fieldKeyValue(field, item) ?? '') === normalizedValue)
    ?? options.find((item) => String(fieldKeyValue(field, item) ?? '') === normalizedValue)
    ?? cachedSelectedItem ?? objectSelectedItem;
  const selectedText = selectedItem ? fieldTextValue(field, selectedItem) : '';
  const query = draftQuery ?? selectedText;
  const controlId = id ?? generatedId;
  const activeOptionIndex = items.length === 0 ? 0 : Math.min(activeIndex, items.length - 1);

  useEffect(() => {
    if (!field.url || normalizedValue === '' || selectedItem || cachedSelectedItem) return;
    const source = createRemoteSource(field, httpClient, resourceStoreFactory, prependData);
    if (!source.byKey) return;
    let cancelled = false;
    source.byKey(value && typeof value === 'object' ? fieldKeyValue(field, value as DataRecord) : value)
      .then((item) => {
        if (!cancelled && item) setSelectedItemCache(item);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [cachedSelectedItem, field, httpClient, normalizedValue, prependData, resourceStoreFactory, selectedItem, value]);

  useEffect(() => {
    if (!field.url || !field.searchEnabled || !open) return;
    // Use draftQuery directly (not the display-text fallback `query`) so that
    // opening the dropdown with no active search (draftQuery=null) issues a
    // blank query and returns the full default list instead of filtering by
    // the previously-selected item's label.
    const searchValue = (draftQuery ?? '').trim();
    const timer = setTimeout(() => {
      setLoading(true);
      setHasMore(true);
      createRemoteSource(field, httpClient, resourceStoreFactory, prependData)
        .load({ take: 50, skip: 0, searchExpr: fieldSearchExpr(field), searchValue: searchValue === '' ? undefined : searchValue })
        .then((result) => {
          setSearchedItems(result.data);
          setHasMore(result.data.length === 50 && (result.totalCount === undefined || result.data.length < result.totalCount));
        })
        .catch(() => { setSearchedItems(null); setHasMore(false); })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [draftQuery, field, httpClient, open, prependData, resourceStoreFactory]);

  const loadMore = useCallback(() => {
    if (!field.url || !field.searchEnabled || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const searchValue = (draftQuery ?? '').trim();
    const currentCount = searchedItems ? searchedItems.length : 0;
    createRemoteSource(field, httpClient, resourceStoreFactory, prependData)
      .load({ take: 50, skip: currentCount, searchExpr: fieldSearchExpr(field), searchValue: searchValue === '' ? undefined : searchValue })
      .then((result) => {
        setSearchedItems((prev) => {
          const nextItems = [...(prev ?? []), ...result.data];
          const seen = new Set();
          return nextItems.filter((item) => { const k = fieldKeyValue(field, item); if (seen.has(k)) return false; seen.add(k); return true; });
        });
        const nextTotal = currentCount + result.data.length;
        setHasMore(result.data.length === 50 && (result.totalCount === undefined || nextTotal < result.totalCount));
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [draftQuery, field, hasMore, httpClient, loading, loadingMore, prependData, resourceStoreFactory, searchedItems]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const t = event.currentTarget;
    if (t.scrollHeight - t.scrollTop <= t.clientHeight + 20) loadMore();
  };

  const selectItem = (item: DataRecord) => {
    setSelectedItemCache(item);
    onChange(fieldKeyValue(field, item) ?? null, item);
    setDraftQuery(null);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(0, Math.min(items.length - 1, current + 1)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === 'Enter' && open && items[activeOptionIndex]) {
      event.preventDefault();
      selectItem(items[activeOptionIndex]);
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
      activeOptionId={open && items[activeOptionIndex] ? `${controlId}-option-${String(fieldKeyValue(field, items[activeOptionIndex]))}` : undefined}
      className={className}
      containerRef={containerRef}
      disabled={disabled}
      id={controlId}
      label={field.label}
      menuRef={menuRef}
      menuStyle={menuStyle}
      normalizedValue={normalizedValue}
      onClear={() => { setSelectedItemCache(null); setActiveIndex(0); onChange(null, null); setDraftQuery(''); setOpen(true); }}
      onKeyDown={handleKeyDown}
      onQueryChange={(v) => { setActiveIndex(0); setDraftQuery(v); setOpen(true); if (v === '') onChange(null, null); }}
      onScroll={handleScroll}
      open={open}
      query={query}
      readOnly={readOnly}
      required={required}
      setDraftQuery={setDraftQuery}
      setOpen={setOpen}
    >
      {loading && items.length === 0 && <div className="nb-form__lookup-status">{t('form.lookupSearching')}</div>}
      {!loading && items.length === 0 && <div className="nb-form__lookup-status">{t('form.lookupNoResults')}</div>}
      {!loading && items.map((item) => {
        const itemValue = fieldKeyValue(field, item);
        const isActive = items[activeOptionIndex] === item;
        return (
          <button key={String(itemValue)} id={`${controlId}-option-${String(itemValue)}`} type="button" role="option" aria-selected={String(itemValue ?? '') === normalizedValue} className={`nb-form__lookup-option${isActive ? ' is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => selectItem(item)}>
            {fieldTextValue(field, item)}
          </button>
        );
      })}
      {loadingMore && <div className="nb-form__lookup-status">{t('form.lookupLoadingMore')}</div>}
    </LookupDropdown>
  );
}

function NativeEnumSelect({
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
  const { open, setOpen, draftQuery, setDraftQuery, containerRef, menuRef, menuStyle } = useLookupDropdown();
  const [activeIndex, setActiveIndex] = useState(0);

  const allItems: DataRecord[] = field.data ?? [];
  const normalizedValue = String(value ?? '');
  const selectedItem = allItems.find((item) => String(item['value'] ?? '') === normalizedValue);
  const selectedText = selectedItem ? String(selectedItem['text'] ?? selectedItem['value'] ?? '') : '';
  const query = draftQuery ?? selectedText;
  const visibleItems = draftQuery != null && draftQuery !== ''
    ? allItems.filter((item) => String(item['text'] ?? item['value'] ?? '').toLowerCase().includes(draftQuery.toLowerCase()))
    : allItems;
  const controlId = id ?? generatedId;
  const activeOptionIndex = visibleItems.length === 0 ? 0 : Math.min(activeIndex, visibleItems.length - 1);

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
      activeOptionId={open && visibleItems[activeOptionIndex] ? `${controlId}-option-${String(visibleItems[activeOptionIndex]['value'] ?? '')}` : undefined}
      className={className}
      containerRef={containerRef}
      disabled={disabled}
      id={controlId}
      label={field.label}
      menuRef={menuRef}
      menuStyle={menuStyle}
      normalizedValue={normalizedValue}
      onClear={() => { setActiveIndex(0); onChange(null); setDraftQuery(''); setOpen(true); }}
      onKeyDown={handleKeyDown}
      onQueryChange={(v) => { setActiveIndex(0); setDraftQuery(v); setOpen(true); if (v === '') onChange(null); }}
      open={open}
      query={query}
      readOnly={readOnly}
      required={required}
      setDraftQuery={setDraftQuery}
      setOpen={setOpen}
    >
      {visibleItems.length === 0 && <div className="nb-form__lookup-status">{t('form.lookupNoResults')}</div>}
      {visibleItems.map((item) => {
        const itemValue = String(item['value'] ?? '');
        const isActive = visibleItems[activeOptionIndex] === item;
        return (
          <button key={itemValue} id={`${controlId}-option-${itemValue}`} type="button" role="option" aria-selected={itemValue === normalizedValue} className={`nb-form__lookup-option${isActive ? ' is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => selectItem(item)}>
            {String(item['text'] ?? item['value'] ?? '')}
          </button>
        );
      })}
    </LookupDropdown>
  );
}

type Translator = (key: keyof CoreTranslationKeys, options?: DataRecord) => string;

function validateField(field: Field, value: unknown, formData: FormDataRecord, t: Translator): string | null {
  if (field.required && isEmptyValue(value)) return t('form.fieldRequired', { label: field.label });

  for (const rule of field.validators ?? []) {
    if (rule.type === 'required' && isEmptyValue(value)) return rule.options.message ?? t('form.fieldRequired', { label: field.label });
    if (rule.type === 'email' && typeof value === 'string' && value !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return rule.options.message ?? t('form.invalidEmail');
    }
    if (rule.type === 'numeric' && value !== '' && value != null && Number.isNaN(Number(value))) {
      return rule.options.message ?? t('form.invalidNumeric');
    }
    if (rule.type === 'pattern' && typeof value === 'string' && !new RegExp(rule.options.pattern).test(value)) {
      return rule.options.message ?? t('form.invalidPattern');
    }
    if (rule.type === 'stringLength' && typeof value === 'string') {
      if (rule.options.min !== undefined && value.length < rule.options.min) return rule.options.message ?? t('form.stringTooShort');
      if (rule.options.max !== undefined && value.length > rule.options.max) return rule.options.message ?? t('form.stringTooLong');
    }
    if (rule.type === 'range' && value !== '' && value != null) {
      const numericValue = Number(value);
      if (rule.options.min !== undefined && numericValue < rule.options.min) return rule.options.message ?? t('form.outOfRange');
      if (rule.options.max !== undefined && numericValue > rule.options.max) return rule.options.message ?? t('form.outOfRange');
    }
    if (rule.type === 'compare') {
      const target = rule.options.comparisonTarget();
      const comparison = rule.options.comparisonType ?? '==';
      const valid =
        comparison === '==' ? value === target :
        comparison === '!=' ? value !== target :
        comparison === '>' ? Number(value) > Number(target) :
        comparison === '<' ? Number(value) < Number(target) :
        comparison === '>=' ? Number(value) >= Number(target) :
        Number(value) <= Number(target);
      if (!valid) return rule.options.message ?? t('validation.defaultError');
    }
    if (rule.type === 'custom' && !rule.options.validationCallback({ value, data: formData })) {
      return rule.options.message ?? t('validation.defaultError');
    }
  }

  return null;
}

function DetailColumnGroup({
  allowDeleting,
  fields,
  colWidths,
}: {
  allowDeleting?: boolean;
  fields: Field[];
  colWidths: Record<string, number>;
}) {
  return (
    <colgroup>
      {fields.map((field) => {
        const width = colWidths[field.name] ?? field.width;
        return <col key={field.name} style={width ? { width } : undefined} />;
      })}
      {allowDeleting && <col className="nb-form__col-actions-col" />}
    </colgroup>
  );
}

function DetailSummaryFooter({
  allowDeleting,
  colWidths,
  fields,
  rows,
  scrollRef,
  summary,
}: {
  allowDeleting?: boolean;
  colWidths: Record<string, number>;
  fields: Field[];
  rows: FormDataRecord[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  summary?: DetailSummaryOptions;
}) {
  if (!summary?.items.length || summary.visible === false) return null;

  const itemsByColumn = new Map(summary.items.filter((item) => item.column).map((item) => [item.column, item]));

  return (
    <div ref={scrollRef} className="nb-form__detail-summary-wrap" aria-hidden="true">
      <table className="nb-form__detail-table nb-form__detail-summary-table">
        <DetailColumnGroup allowDeleting={allowDeleting} colWidths={colWidths} fields={fields} />
        <tbody className="nb-form__detail-summary">
          <tr>
            {fields.map((field) => {
              const item = itemsByColumn.get(field.name);
              const align = item?.align ?? field.align;
              const justifyContent = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
              return (
                <td key={field.name} style={align ? { textAlign: align } : undefined}>
                  {item && (
                    <div className="nb-form__detail-summary-cell" style={{ justifyContent }}>
                      {item.label && <span className="nb-form__detail-summary-label">{item.label}</span>}
                      <span className="nb-form__detail-summary-value">{resolveSummaryText(rows, item)}</span>
                    </div>
                  )}
                </td>
              );
            })}
            {allowDeleting && <td className="nb-form__col-actions" />}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function NativeDetailGrid({
  allowAdding = true,
  allowDeleting = true,
  allowUpdating = true,
  detailFields,
  httpClient,
  detailErrors = {},
  onClearCellError,
  onRowsChange,
  onRowsMutated,
  prependData,
  remoteOptions,
  rows,
  summary,
}: {
  allowAdding?: boolean;
  allowDeleting?: boolean;
  allowUpdating?: boolean;
  detailFields: Field[];
  httpClient: CoreHttpClient;
  detailErrors?: DetailFieldErrors;
  onClearCellError?: (rowIndex: number, fieldName: string) => void;
  onRowsChange: (rows: FormDataRecord[]) => void;
  onRowsMutated: () => void;
  prependData?: PrependDataMap;
  remoteOptions: Record<string, DataRecord[]>;
  rows: FormDataRecord[];
  summary?: DetailSummaryOptions;
}) {
  const { t } = useCoreTranslation();
  const visibleFields = detailFields.filter((field) => field.visible && !field.hidden);
  const rowKeysRef = useRef<string[]>(rows.map(() => safeRandomId()));
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const summaryWrapRef = useRef<HTMLDivElement>(null);

  // Re-generate keys when the parent resets rows to a different-length array
  // (e.g. switching between edit records). addRow/removeRow keep rowKeysRef
  // in sync before their onRowsChange fires, so this guard only triggers on a
  // true external reset. Reading/writing the ref here is intentional.
  // eslint-disable-next-line react-hooks/refs
  if (rowKeysRef.current.length !== rows.length) {
    rowKeysRef.current = rows.map(() => safeRandomId()); // eslint-disable-line react-hooks/refs
  }

  // ── Column resize ────────────────────────────────────────────────────────────
  // Tracks user-overridden column widths. Falls back to field.width when not set.
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ name: string; startX: number; startWidth: number } | null>(null);

  const handleResizeMouseDown = (fieldName: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest('th') as HTMLTableCellElement | null;
    if (!th) return;
    resizingRef.current = { name: fieldName, startX: e.clientX, startWidth: th.offsetWidth };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const next = Math.max(36, resizingRef.current.startWidth + (ev.clientX - resizingRef.current.startX));
      setColWidths((prev) => ({ ...prev, [resizingRef.current!.name]: next })); // eslint-disable-line react-hooks/refs
    };
    const onMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useLayoutEffect(() => {
    const tableScroll = tableScrollRef.current;
    const summaryWrap = summaryWrapRef.current;
    if (!tableScroll || !summaryWrap) return;

    const syncSummaryScroll = () => {
      summaryWrap.scrollLeft = tableScroll.scrollLeft;
    };

    syncSummaryScroll();
    tableScroll.addEventListener('scroll', syncSummaryScroll, { passive: true });
    return () => tableScroll.removeEventListener('scroll', syncSummaryScroll);
  }, [colWidths]);

  const updateCell = async (rowIndex: number, field: Field, value: unknown) => {
    onClearCellError?.(rowIndex, field.name);
    let nextRow = { ...rows[rowIndex], [field.name]: value };
    if (field.onChange) {
      const draft = { ...rows[rowIndex] };
      const fieldContext = {
        defaultSetCellValue: (row: FormDataRecord, nextValue: unknown) => {
          row[field.name] = nextValue;
        },
      };
      await (field.onChange as (...args: unknown[]) => void | Promise<void>).call(fieldContext, draft, value, rows[rowIndex]);
      nextRow = { ...nextRow, ...draft };
    }
    const nextRows = rows.map((row, index) => index === rowIndex ? nextRow : row);
    onRowsChange(nextRows);
    onRowsMutated();
  };

  const addRow = () => {
    rowKeysRef.current.push(safeRandomId());
    onRowsChange([...rows, buildEmptyRow(detailFields)]);
    onRowsMutated();
  };

  const removeRow = (rowIndex: number) => {
    rowKeysRef.current.splice(rowIndex, 1);
    onRowsChange(rows.filter((_, index) => index !== rowIndex));
    onRowsMutated();
  };

  const renderDetailControl = (row: FormDataRecord, rowIndex: number, field: Field) => {
    const value = row[field.name];
    const error = detailErrors[rowIndex]?.[field.name];
    const errorClass = error ? ' is-error' : '';
    if (field.formatter && field.type === FieldType.NONE) {
      return field.formatter({ value, data: row, rowIndex, columnIndex: 0 });
    }
    if (field.type === FieldType.ENTITY) {
      return (
        <NativeEntitySelect
          className={`nb-form__control${errorClass}`}
          disabled={!allowUpdating || field.disabled}
          field={field}
          httpClient={httpClient}
          options={remoteOptions[field.name] ?? field.data ?? []}
          prependData={prependData?.get(field.name)}
          value={value}
          onChange={(nextValue) => void updateCell(rowIndex, field, nextValue)}
        />
      );
    }
    if (field.type === FieldType.SELECT || field.type === FieldType.ENUM) {
      return (
        <NativeEnumSelect
          className={`nb-form__control${errorClass}`}
          disabled={!allowUpdating || field.disabled}
          field={field}
          value={value}
          onChange={(nextValue) => void updateCell(rowIndex, field, nextValue)}
        />
      );
    }
    return (
      <input
        className={`nb-form__control${errorClass}`}
        value={inputValue(value)}
        readOnly={!allowUpdating || field.readonly}
        disabled={field.disabled}
        type={field.type === FieldType.NUMBER || field.type === FieldType.CURRENCY ? 'number' : 'text'}
        onChange={(event) => void updateCell(rowIndex, field, event.target.value)}
      />
    );
  };

  return (
    <div className="nb-form__detail">
      <div className="nb-form__detail-heading">
        <h3 className="nb-form__detail-title">{t('form.detailTitle')}</h3>
        {allowAdding && (
          <IconButton icon="ph ph-plus" label={t('form.detailAdd')} onClick={addRow} />
        )}
      </div>
      <div className="nb-form__detail-table-wrap">
        <div ref={tableScrollRef} className="nb-form__detail-table-scroll">
          <table className="nb-form__detail-table">
            <DetailColumnGroup allowDeleting={allowDeleting} colWidths={colWidths} fields={visibleFields} />
            <thead>
              <tr>
                {visibleFields.map((field) => (
                    <th
                      key={field.name}
                      style={field.align ? { textAlign: field.align } : undefined}
                    >
                      <span className="nb-form__col-header-text">{field.label}</span>
                      <span
                        className="nb-form__col-resize"
                        onMouseDown={handleResizeMouseDown(field.name)}
                        title={t('grid.resizeColumn')}
                      />
                    </th>
                ))}
                {allowDeleting && <th className="nb-form__col-actions" />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={visibleFields.length + (allowDeleting ? 1 : 0)} className="nb-form__detail-empty">
                    <i className="ph ph-package nb-form__detail-empty-icon" aria-hidden="true" />
                    <span className="nb-form__detail-empty-text">{t('form.detailEmpty')}</span>
                    {allowAdding && (
                      <span className="nb-form__detail-empty-hint">{t('form.detailEmptyHint')}</span>
                    )}
                  </td>
                </tr>
              )}
              {/* eslint-disable react-hooks/refs -- rowKeysRef is updated synchronously by addRow/removeRow before onRowsChange fires, so it is always in sync with rows here */}
              {rows.map((row, rowIndex) => {
                const rowKey = rowKeysRef.current[rowIndex]; // eslint-disable-line react-hooks/refs
                return (
                <tr key={rowKey}>
                  {visibleFields.map((field) => (
                    <td key={field.name} style={field.align ? { textAlign: field.align } : undefined}>
                      {renderDetailControl(row, rowIndex, field)}
                      {detailErrors[rowIndex]?.[field.name] && <span className="nb-form__error"><i className="ph ph-warning-circle" aria-hidden="true" />{detailErrors[rowIndex][field.name]}</span>}
                    </td>
                  ))}
                  {allowDeleting && (
                    <td className="nb-form__col-actions">
                      <IconButton icon="ph ph-trash" label={t('form.detailRemove')} onClick={() => removeRow(rowIndex)} />
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <DetailSummaryFooter
          allowDeleting={allowDeleting}
          colWidths={colWidths}
          fields={visibleFields}
          rows={rows}
          scrollRef={summaryWrapRef}
          summary={summary}
        />
      </div>
    </div>
  );
}

export const NativeFormView = forwardRef<FormHandle, FormViewOptions>((options, ref) => {
  const { t } = useCoreTranslation();
  const { notify } = useCoreRuntime();
  const httpClient = useCoreHttpClient();
  const resourceStoreFactory = useResourceStoreFactory();
  const [on, emit] = useEvents();
  const instanceId = useId();
  const scopedFormErrorsEvent = `${FORM_ERRORS_EVENT}:${instanceId}`;
  const isEdit = useRef(false);
  const uploadedFiles = useRef<UploadedFile[]>([]);
  const existingMediaByField = useRef<Record<string, FormDataRecord>>({});

  const upsertUploadedFile = useCallback((entry: UploadedFile) => {
    uploadedFiles.current = [
      ...uploadedFiles.current.filter((file) => file.name !== entry.name),
      entry,
    ];
  }, []);

  const [formData, setFormData] = useState<FormDataRecord>(() => buildEmptyRow(options.fields));
  const formDataRef = useRef(formData);
  const [detailRows, setDetailRows] = useState<FormDataRecord[]>([]);
  const detailRowsRef = useRef(detailRows);
  const [fieldState, setFieldState] = useState<Record<string, FieldState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detailErrors, setDetailErrors] = useState<DetailFieldErrors>({});
  const [remoteOptions, setRemoteOptions] = useState<Record<string, DataRecord[]>>({});
  const [activeTab, setActiveTab] = useState(0);
  const appliedOperationRef = useRef<string | null>(null);
  const prependDataRef = useRef<PrependDataMap>(new Map());

  const fields = options.fields;
  const onFieldDataChanged = options.onFieldDataChanged;
  const detailPropertyName = options.detailPropertyName ?? 'items';
  const computedFieldNames = useMemo(() => fields.filter((field) => field.computed !== undefined).map((field) => field.name), [fields]);
  const viewportWidth = useViewportWidth();
  const formLayoutModel = useMemo(() => buildFormLayoutModel(fields, options.formLayout, t('form.groupOther')), [fields, options.formLayout, t]);
  const optionFields = useMemo(() => [...fields, ...(options.detailFields ?? [])], [fields, options.detailFields]);
  const baseColSpanContext = useMemo<FieldColSpanContext>(() => buildFieldColSpanContext({
    presentationMode: options.presentationContext?.presentationMode ?? 'dialog',
    drawerWidth: options.presentationContext?.drawerWidth,
    dialogWidth: options.presentationContext?.dialogWidth,
    viewportWidth: options.presentationContext?.viewportWidth ?? viewportWidth,
    containerWidth: options.presentationContext?.containerWidth,
    hasTabs: options.presentationContext?.hasTabs ?? formLayoutModel.type === 'tabs',
    hasMasterDetail: options.presentationContext?.hasMasterDetail ?? !!options.detailFields,
  }), [
    formLayoutModel.type,
    options.detailFields,
    options.presentationContext,
    viewportWidth,
  ]);

  const setNextFormData = useCallback((nextData: FormDataRecord) => {
    formDataRef.current = nextData;
    setFormData(nextData);
    onFieldDataChanged?.(nextData);
  }, [onFieldDataChanged]);

  const setNextDetailRows = useCallback((nextRows: FormDataRecord[]) => {
    detailRowsRef.current = nextRows;
    setDetailRows(nextRows);
  }, []);

  const notifyDetailRowsMutated = useCallback(() => {
    emit(FORM_EVENTS.ROW_UPDATED, detailRowsRef.current);
  }, [emit]);

  const setFieldValue = useCallback((name: string, value: unknown) => {
    const field = fields.find((candidate) => candidate.name === name);
    const nextData = { ...formDataRef.current, [name]: value };
    formDataRef.current = nextData;
    setFormData(nextData);
    setErrors((current) => ({ ...current, [name]: '' }));
    onFieldDataChanged?.(nextData);
    void (field?.onChange as ((value: unknown) => void | Promise<void>) | undefined)?.(value);
  }, [fields, onFieldDataChanged]);

  const clearDetailCellError = useCallback((rowIndex: number, fieldName: string) => {
    setDetailErrors((current) => {
      const rowErrors = current[rowIndex];
      if (!rowErrors?.[fieldName]) return current;
      const nextRowErrors = { ...rowErrors };
      delete nextRowErrors[fieldName];
      const next = { ...current };
      if (Object.keys(nextRowErrors).length === 0) {
        delete next[rowIndex];
      } else {
        next[rowIndex] = nextRowErrors;
      }
      return next;
    });
  }, []);

  useEffect(() => { formDataRef.current = formData; }, [formData]);
  useEffect(() => { detailRowsRef.current = detailRows; }, [detailRows]);

  useEffect(() => {
    optionFields.forEach((field) => {
      if (field.type !== FieldType.ENTITY && field.type !== FieldType.TAGS) return;
      if (!field.url) {
        setRemoteOptions((current) => ({ ...current, [field.name]: field.data ?? [] }));
        return;
      }
      const source = createRemoteSource(field, httpClient, resourceStoreFactory, prependDataRef.current.get(field.name));
      source
        .load({ take: 50 })
        .then((result) => {
          setRemoteOptions((current) => ({ ...current, [field.name]: result.data }));
          if (field.autoSelectIfSingle && result.data.length === 1 && isEmptyValue(formDataRef.current[field.name])) {
            setFieldValue(field.name, fieldKeyValue(field, result.data[0]));
          }
        })
        .catch(() => {
          setRemoteOptions((current) => ({ ...current, [field.name]: field.data ?? [] }));
        });
    });
  }, [httpClient, optionFields, resourceStoreFactory, setFieldValue]);

  useEffect(() => {
    fields.forEach((field) => {
      const optionsForField = remoteOptions[field.name];
      if (!field.autoSelectIfSingle || optionsForField?.length !== 1 || !isEmptyValue(formDataRef.current[field.name])) return;
      setFieldValue(field.name, fieldKeyValue(field, optionsForField[0]));
    });
  }, [fields, formData, remoteOptions, setFieldValue]);

  const validateForm = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    options.fields.forEach((field) => {
      const state = fieldState[field.name];
      if (field.isIdentity || state?.validationEnabled === false || state?.hidden === true || field.hidden || field.visibleOnForm === false) return;

      let value = formDataRef.current[field.name];
      if (field.type === FieldType.FILE) {
        const uploaded = uploadedFiles.current.find((file) => file.name === field.name);
        const hasExisting = !!existingMediaByField.current[field.name];
        value = uploaded?.iri != null || (hasExisting && uploaded === undefined)
          ? 'present'
          : null;
      }

      const error = validateField(field, value, formDataRef.current, t);
      if (error) nextErrors[field.name] = error;
    });
    setErrors(nextErrors);
    setDetailErrors({});
    return Object.keys(nextErrors).length === 0;
  }, [fieldState, options.fields, t]);

  const validate = useFormValidation({
    accessors: {
      getDetailRowCount: () => detailRowsRef.current.length,
      getDetailRows: () => detailRowsRef.current,
      hasPendingDetailEdits: () => false,
      validateForm,
    },
    detailFields: options.detailFields,
    detailNoDataText: options.requiredDetail ? t('form.detailRequired') : t('form.detailEmpty'),
    requiredDetail: options.requiredDetail,
    validationErrorText: t('form.validationError'),
  });

  const submitAccessors = useMemo(() => ({
    getDetailRows: () => detailRowsRef.current,
    getFieldValue: (field: string) => formDataRef.current[field],
    getFormData: () => formDataRef.current,
    getUploadedFiles: () => uploadedFiles.current,
    isEditMode: () => isEdit.current,
  }), []);

  const { handleSave, handleDelete } = useFormSubmit({
    url: options.url,
    detailUrl: options.detailUrl,
    fields: options.fields,
    detailFields: options.detailFields,
    detailPropertyName,
    format: options.format,
    events: options.events,
    formErrorsEvent: scopedFormErrorsEvent,
    httpClient,
    adapter: options.adapter,
    onSaveSuccess: options.onSaveSuccess,
    onSaveError: options.onSaveError,
    onDeleteSuccess: options.onDeleteSuccess,
    onDeleteError: options.onDeleteError,
    onLoadingChange: options.onLoadingChange,
  }, submitAccessors, emit, validate);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const handleDeleteRef = useRef(handleDelete);
  handleDeleteRef.current = handleDelete;

  const captureExistingMedia = useCallback((row: FormDataRecord) => {
    const nextMedia: Record<string, FormDataRecord> = {};
    options.fields.forEach((field) => {
      if (field.type !== FieldType.FILE) return;
      const raw = row[field.name];
      if (raw && typeof raw === 'object') {
        nextMedia[field.name] = raw as FormDataRecord;
      }
    });
    existingMediaByField.current = nextMedia;
  }, [options.fields]);

  const applyAddPayload = useCallback((payload: EventRowPayload | undefined) => {
    uploadedFiles.current = [];
    existingMediaByField.current = {};
    setErrors({});
    setDetailErrors({});
    setNextDetailRows([]);
    prependDataRef.current = new Map();
    const row = payload ? normalizeFormData(payload, options.fields, options.adapter, prependDataRef.current) : buildEmptyRow(options.fields);
    setNextFormData(row);
    options.fields.forEach((field) => {
      const value = row[field.name];
      if (value !== undefined) {
        void (field.onChange as ((value: unknown) => void | Promise<void>) | undefined)?.(value);
      }
    });
    if (payload && Array.isArray(payload[detailPropertyName])) {
      setNextDetailRows(payload[detailPropertyName] as FormDataRecord[]);
    }
    isEdit.current = false;
  }, [detailPropertyName, options.adapter, options.fields, setNextDetailRows, setNextFormData]);

  const applyEditPayload = useCallback((payload: { row: FormDataRecord }) => {
    prependDataRef.current = new Map();
    captureExistingMedia(payload.row);
    const row = normalizeFormData(payload.row, options.fields, options.adapter, prependDataRef.current);
    uploadedFiles.current = [];
    setErrors({});
    setDetailErrors({});
    setNextFormData(row);
    isEdit.current = true;

    const idField = options.fields.find((field) => field.isIdentity)?.name ?? '';
    const detailId = row[idField];
    const detailUrl = typeof detailId === 'string' || typeof detailId === 'number' ? options.detailUrl?.replace('{id}', String(detailId)) : undefined;
    if (!detailUrl) return;

    emit(FORM_EVENTS.LOADING, true);
    httpClient
      .get<FormDataRecord[]>(detailUrl)
      .then((response) => setNextDetailRows(response.data))
      .finally(() => emit(FORM_EVENTS.LOADING, false));
  }, [captureExistingMedia, emit, httpClient, options.adapter, options.detailUrl, options.fields, setNextDetailRows, setNextFormData]);

  useEffect(() => {
    if (!options.operation) {
      appliedOperationRef.current = null;
      return;
    }
    const operationKey = `${options.operation}:${options.operationVersion ?? 0}`;
    if (appliedOperationRef.current === operationKey) return;
    appliedOperationRef.current = operationKey;

    if (options.operation === 'add') {
      applyAddPayload(options.rowData ?? undefined);
      return;
    }
    if (options.operation === 'edit' && options.rowData) {
      applyEditPayload({ row: options.rowData });
    }
  }, [applyAddPayload, applyEditPayload, options.operation, options.operationVersion, options.rowData]);

  useEffect(() => {
    const subs = [
      on<unknown>(scopedFormErrorsEvent, (formErrors) => {
        const mapped = mapApiViolations(formErrors, detailPropertyName, t('validation.defaultError'));
        notify(t('form.validationError'), 'error');
        setErrors((current) => {
          return { ...current, ...mapped.fieldErrors };
        });
        setDetailErrors(mapped.detailErrors);
      }),
    ];

    if (options.events?.ADD) subs.push(on(options.events.ADD, (payload: EventRowPayload | undefined) => applyAddPayload(payload)));
    if (options.events?.EDIT) {
      subs.push(on(options.events.EDIT, (payload: { row: FormDataRecord }) => applyEditPayload(payload)));
    }
    if (options.events?.DELETE) subs.push(on(options.events.DELETE, (payload: { row: FormDataRecord }) => handleDeleteRef.current(payload)));
    if (options.events?.SAVE) subs.push(on(options.events.SAVE, () => handleSaveRef.current()));

    return () => subs.forEach((sub) => sub.unsubscribe());
    // scopedFormErrorsEvent is stable (from useId); all other values here are either stable
    // or accessed through refs, so a single mount subscription is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedFormErrorsEvent]);

  useEffect(() => {
    if (computedFieldNames.length === 0 || !options.computedValues) return;
    let changed = false;
    const nextData = { ...formDataRef.current };
    computedFieldNames.forEach((name) => {
      if (Object.prototype.hasOwnProperty.call(options.computedValues, name) && nextData[name] !== options.computedValues?.[name]) {
        nextData[name] = options.computedValues?.[name];
        changed = true;
      }
    });
    if (changed) setNextFormData(nextData);
  }, [computedFieldNames, options.computedValues, setNextFormData]);

  useImperativeHandle(ref, () => ({
    getFormData: () => formDataRef.current,
    getFieldValue: (name) => formDataRef.current[name],
    setFieldValue,
    getDetailData: () => detailRowsRef.current,
    setDetailData: setNextDetailRows,
    saveDetailData: () => undefined,
    reloadDetailData: () => undefined,
    setValues: (data) => {
      prependDataRef.current = new Map();
      setNextFormData(normalizeFormData(data, options.fields, undefined, prependDataRef.current));
    },
    save: () => handleSaveRef.current(),
    deleteRow: (row) => handleDeleteRef.current({ row }),
    setReadonly: (field, value) => setFieldState((current) => ({ ...current, [field]: { ...current[field], readonly: value } })),
    setDisabled: (field, value) => setFieldState((current) => ({ ...current, [field]: { ...current[field], disabled: value } })),
    enableValidation: (field) => setFieldState((current) => ({ ...current, [field]: { ...current[field], validationEnabled: true } })),
    disableValidation: (field) => setFieldState((current) => ({ ...current, [field]: { ...current[field], validationEnabled: false } })),
    setError: (field, message) => setErrors((current) => ({ ...current, [field]: message })),
    showField: (field) => setFieldState((current) => ({ ...current, [field]: { ...current[field], hidden: false } })),
    hideField: (field) => setFieldState((current) => ({ ...current, [field]: { ...current[field], hidden: true } })),
    validate,
    setIsEdit: (value) => { isEdit.current = value; },
  }), [options.fields, setFieldValue, setNextDetailRows, setNextFormData, validate]);

  const renderField = (field: Field, span: ColSpan) => {
    const state = fieldState[field.name] ?? {};
    if (field.isIdentity || !field.visibleOnForm || field.hidden || state.hidden) return null;
    const value = formData[field.name];
    const readOnly = state.readonly ?? field.readonly ?? options.editable === false;
    const disabled = state.disabled ?? field.disabled;
    const error = errors[field.name];
    const errorClass = error ? ' is-error' : '';
    const actionClass = field.onClick ? ' nb-form__control--action' : '';
    const commonProps = {
      className: `nb-form__control${actionClass}${errorClass}`,
      disabled,
      id: `nb-form-${field.name}`,
      name: field.name,
      onClick: field.onClick,
      readOnly,
      required: field.required,
    };

    let control: React.ReactNode;
    if (field.contentRender && typeof field.contentRender === 'function') {
      control = field.contentRender({ data: formData, value });
    } else if (field.type === FieldType.TEXTAREA || field.type === FieldType.HTML) {
      control = <textarea {...commonProps} className={`nb-form__control nb-form__textarea${errorClass}`} value={inputValue(value)} onChange={(event) => setFieldValue(field.name, event.target.value)} />;
    } else if (field.type === FieldType.CHECKBOX || field.type === FieldType.SWITCH) {
      const isSwitch = field.type === FieldType.SWITCH;
      control = (
        <label className={isSwitch ? 'nb-form__switch' : 'nb-form__checkbox'}>
          <input type="checkbox" checked={Boolean(value)} disabled={disabled || readOnly} onChange={(event) => setFieldValue(field.name, event.target.checked)} />
          <span className={isSwitch ? 'nb-form__toggle-label' : undefined}>{field.label}</span>
        </label>
      );
    } else if (field.type === FieldType.RADIO) {
      control = (
        <div className="nb-form__radio-list">
          {(field.data ?? []).map((item) => {
            const itemValue = item['value'];
            return <label key={String(itemValue)} className="nb-form__radio-item"><input type="radio" checked={value === itemValue} disabled={disabled || readOnly} onChange={() => setFieldValue(field.name, itemValue)} />{String(item['text'] ?? itemValue)}</label>;
          })}
        </div>
      );
    } else if (field.type === FieldType.ENTITY && !field.multiple) {
      const items = remoteOptions[field.name] ?? field.data ?? [];
      control = (
        <NativeEntitySelect
          className={`nb-form__control${errorClass}`}
          disabled={disabled}
          field={field}
          httpClient={httpClient}
          id={`nb-form-${field.name}`}
          options={items}
          prependData={prependDataRef.current.get(field.name)}
          readOnly={readOnly}
          required={field.required}
          value={value}
          onChange={(nextValue, item) => {
            setFieldValue(field.name, nextValue);
            field.onSelect?.({ value: nextValue, itemData: item ?? undefined });
          }}
        />
      );
    } else if (field.type === FieldType.ENUM || field.type === FieldType.SELECT) {
      control = (
        <NativeEnumSelect
          className={`nb-form__control${errorClass}`}
          disabled={disabled}
          field={field}
          id={`nb-form-${field.name}`}
          readOnly={readOnly}
          required={field.required}
          value={value}
          onChange={(nextValue) => setFieldValue(field.name, nextValue)}
        />
      );
    } else if (field.type === FieldType.TAGS) {
      const items = remoteOptions[field.name] ?? field.data ?? [];
      control = (
        <select {...commonProps} multiple value={Array.isArray(value) ? value.map(String) : []} onChange={(event) => {
          const nextValue = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
          setFieldValue(field.name, nextValue);
        }}>
          {items.map((item) => {
            const itemValue = fieldKeyValue(field, item);
            const itemText = fieldTextValue(field, item);
            return <option key={String(itemValue)} value={String(itemValue ?? '')}>{itemText}</option>;
          })}
        </select>
      );
    } else if (isUploadableFileField(field)) {
      control = (
        <FileUploadField
          field={field}
          disabled={disabled}
          readOnly={readOnly}
          invalid={!!error}
          existingMedia={existingMediaByField.current[field.name] ?? null}
          uploadUrl={field.url}
          httpClient={httpClient}
          t={t}
          onUploaded={upsertUploadedFile}
          onCleared={(fieldName) => {
            delete existingMediaByField.current[fieldName];
            upsertUploadedFile({ name: fieldName, iri: null });
          }}
        />
      );
    } else if (field.type === FieldType.FILE) {
      control = <input {...commonProps} type="file" accept={field.accept ?? undefined} readOnly={undefined} onChange={(event) => {
        setFieldValue(field.name, event.target.files ?? null);
      }} />;
    } else if (field.type === FieldType.DATE) {
      control = (
        <DatePicker
          className={`nb-form__date-control${errorClass}`}
          disabled={disabled}
          id={`nb-form-${field.name}`}
          invalid={!!error}
          locale={getCoreLocale()}
          name={field.name}
          readOnly={readOnly}
          required={field.required}
          value={String(inputValue(value) ?? '')}
          onChange={(nextValue) => setFieldValue(field.name, nextValue)}
        />
      );
    } else {
      const type = field.type === FieldType.NUMBER || field.type === FieldType.CURRENCY ? 'number' : field.type === FieldType.DATETIME ? 'datetime-local' : field.type === FieldType.PASSWORD ? 'password' : 'text';
      const inputControl = <input {...commonProps} type={type} value={inputValue(value)} onChange={(event) => setFieldValue(field.name, event.target.value)} />;
      const fieldButtons = Array.isArray(field.buttons) ? field.buttons : [];
      if (fieldButtons.length > 0) {
        const buttonFormApi: FieldButtonFormApi = {
          getFieldValue: (name) => formDataRef.current[name],
          setFieldValue,
        };
        control = (
          <div className="nb-form__input-group">
            {inputControl}
            <div className="nb-form__input-actions">
              {fieldButtons.map((button, index) => {
                const buttonOptions = button.options ?? {};
                const buttonLabel = button.name === 'search' ? t('form.searchButton') : String(button.name ?? t('form.actionButton'));
                return (
                  <button
                    key={String(button.name ?? index)}
                    type="button"
                    className="nb-form__input-button"
                    disabled={disabled || readOnly}
                    aria-label={buttonLabel}
                    title={buttonLabel}
                    onClick={(event) => buttonOptions.onClick?.(event, buttonFormApi)}
                  >
                    <i className={resolveButtonIcon(buttonOptions.icon)} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      } else {
        control = inputControl;
      }
    }

    return (
      <div key={field.name} className="nb-form__field" style={colSpanStyle(span)}>
        {field.type !== FieldType.CHECKBOX && field.type !== FieldType.SWITCH && <label className={`nb-form__label${field.required ? ' nb-form__label--required' : ''}`} htmlFor={`nb-form-${field.name}`}>{field.label}</label>}
        {control}
        {field.helpText && <span className="nb-form__hint">{field.helpText}</span>}
        {error && <span className="nb-form__error"><i className="ph ph-warning-circle" aria-hidden="true" />{error}</span>}
      </div>
    );
  };

  const renderFields = (visibleFields: Field[], layoutContext?: Partial<FieldColSpanContext>) => {
    const spans = resolveFieldsColSpans(visibleFields, {
      ...baseColSpanContext,
      ...layoutContext,
    });
    return (
      <div className="nb-form__grid">
        {visibleFields.map((field) => renderField(field, spans.get(field.name) ?? 12))}
      </div>
    );
  };

  const renderGroup = (group: FormLayoutGroup) => {
    if (group.collapsible) {
      return (
        <details
          key={group.label}
          className="nb-form__section nb-form__section--collapsible"
          open={!group.defaultCollapsed}
        >
          <summary className="nb-form__section-summary">
            <span className="nb-form__section-title">{group.label}</span>
            <i className="ph ph-caret-down nb-form__section-caret" aria-hidden="true" />
          </summary>
          <div className="nb-form__section-body">
            {renderFields(group.fields, { avoidOrphanFields: group.avoidOrphanFields })}
          </div>
        </details>
      );
    }
    return (
      <section key={group.label} className="nb-form__section">
        <h3 className="nb-form__section-title">{group.label}</h3>
        {renderFields(group.fields, { avoidOrphanFields: group.avoidOrphanFields })}
      </section>
    );
  };

  const renderLayout = (layout: FormLayoutModel) => {
    if (layout.type === 'tabs') {
      const groups = [...layout.tabs, ...(layout.overflow ? [layout.overflow] : [])];
      const current = groups[activeTab] ?? groups[0];
      const tabPanelId = current ? `nb-form-tabpanel-${current.label}` : undefined;

      return (
        <div className="nb-form__tabs">
          <div className="nb-form__tabs-nav" role="tablist" aria-label="Secciones del formulario">
            {groups.map((group, index) => {
              const tabIcon = resolveTabIcon(group.icon);
              const isActive = index === activeTab;

              return (
                <button
                  key={group.label}
                  type="button"
                  role="tab"
                  id={`nb-form-tab-${group.label}`}
                  aria-selected={isActive}
                  aria-controls={isActive ? tabPanelId : undefined}
                  className={`nb-form__tab-button${isActive ? ' nb-form__tab-button--active' : ''}`}
                  onClick={() => setActiveTab(index)}
                >
                  {tabIcon && <i className={tabIcon} aria-hidden="true" />}
                  <span>{group.label}</span>
                </button>
              );
            })}
          </div>
          {current && (
            <div
              className="nb-form__tabs-body"
              role="tabpanel"
              id={tabPanelId}
              aria-labelledby={`nb-form-tab-${current.label}`}
            >
              {renderFields(current.fields)}
            </div>
          )}
        </div>
      );
    }
    if (layout.type === 'sections') {
      return <>{layout.sections.map(renderGroup)}{layout.overflow && renderGroup(layout.overflow)}</>;
    }
    return renderFields(layout.fields);
  };

  const detailGrid = options.detailFields ? (
    <NativeDetailGrid
      allowAdding={options.allowAdding}
      allowDeleting={options.allowDeleting}
      allowUpdating={options.allowUpdating}
      detailFields={options.detailFields}
      detailErrors={detailErrors}
      httpClient={httpClient}
      onClearCellError={clearDetailCellError}
      onRowsMutated={notifyDetailRowsMutated}
      prependData={prependDataRef.current}
      remoteOptions={remoteOptions}
      rows={detailRows}
      summary={options.detailSummary}
      onRowsChange={setNextDetailRows}
    />
  ) : null;

  return (
    <div className={`nb-form${options.detailFields ? ' nb-form--with-detail' : ''} ${options.className ?? ''}`}>
      {options.detailFields ? (
        <div className="nb-form__master-detail">
          <div className="nb-form__master-panel">{renderLayout(formLayoutModel)}</div>
          <div className="nb-form__detail-panel">{detailGrid}</div>
        </div>
      ) : (
        renderLayout(formLayoutModel)
      )}
    </div>
  );
});

NativeFormView.displayName = 'NativeFormView';
