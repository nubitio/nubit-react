import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppDropdown, type AppDropdownOption, type AppDropdownProps } from './AppDropdown';
import './SearchableAppDropdown.scss';

export interface SearchableAppDropdownProps extends Omit<AppDropdownProps, 'options'> {
  options?: AppDropdownOption[];
  /** Client-side filter when `onSearch` is not provided. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Async loader for large catalogs. When set, options are fetched on demand. */
  onSearch?: (query: string) => Promise<AppDropdownOption[]>;
  minSearchLength?: number;
  emptySearchLabel?: string;
  loadingLabel?: string;
  selectedOption?: AppDropdownOption | null;
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function filterOptions(options: AppDropdownOption[], query: string): AppDropdownOption[] {
  const needle = normalizeSearch(query);
  if (!needle) return options;

  return options.filter((option) => {
    const haystack = [option.label, option.selectedLabel, option.value].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

export function SearchableAppDropdown({
  options = [],
  searchable = true,
  searchPlaceholder = 'Buscar…',
  onSearch,
  minSearchLength = 2,
  emptySearchLabel = 'Sin resultados',
  loadingLabel = 'Buscando…',
  selectedOption = null,
  value,
  onChange,
  placeholder,
  disabled,
  ...rest
}: SearchableAppDropdownProps) {
  const searchInputId = useId();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<AppDropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const staticSelected = useMemo(
    () => options.find((option) => option.value === value) ?? selectedOption ?? null,
    [options, selectedOption, value],
  );

  const resolvedOptions = useMemo(() => {
    const merged = new Map<string, AppDropdownOption>();
    for (const option of [...options, ...remoteOptions]) {
      if (option.value) merged.set(option.value, option);
    }
    if (staticSelected?.value) {
      merged.set(staticSelected.value, staticSelected);
    }

    const base = Array.from(merged.values()).filter((option) => option.value !== '');
    if (!searchable) return base;
    if (onSearch) return base;
    return filterOptions(base, searchQuery);
  }, [onSearch, options, remoteOptions, searchable, searchQuery, staticSelected]);

  const runSearch = useCallback(
    async (query: string) => {
      if (!onSearch) return;
      const trimmed = query.trim();
      if (trimmed.length < minSearchLength) {
        setRemoteOptions([]);
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const results = await onSearch(trimmed);
        if (requestId !== requestIdRef.current) return;
        setRemoteOptions(results.filter((option) => option.value !== ''));
      } catch {
        if (requestId !== requestIdRef.current) return;
        setRemoteOptions([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [minSearchLength, onSearch],
  );

  useEffect(() => {
    if (!open || !onSearch) return;
    const timer = window.setTimeout(() => {
      void runSearch(searchQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, onSearch, runSearch, searchQuery]);

  useEffect(() => {
    if (open) return;
    setSearchQuery('');
    setRemoteOptions([]);
    setLoading(false);
  }, [open]);

  const menuHeader = searchable ? (
    <div className="nb-searchable-dropdown__search">
      <i className="ph ph-magnifying-glass" aria-hidden="true" />
      <input
        id={searchInputId}
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={searchPlaceholder}
        autoComplete="off"
        onKeyDown={(event) => event.stopPropagation()}
      />
    </div>
  ) : null;

  const menuFooter: ReactNode = (() => {
    if (!searchable || !onSearch) return null;
    if (loading) {
      return <div className="nb-searchable-dropdown__status">{loadingLabel}</div>;
    }
    if (searchQuery.trim().length < minSearchLength) {
      return (
        <div className="nb-searchable-dropdown__status">
          Escribe al menos {minSearchLength} caracteres
        </div>
      );
    }
    if (resolvedOptions.length === 0) {
      return <div className="nb-searchable-dropdown__status">{emptySearchLabel}</div>;
    }
    return null;
  })();

  return (
    <AppDropdown
      {...rest}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      options={[{ value: '', label: placeholder ?? 'Seleccionar…' }, ...resolvedOptions]}
      menuHeader={menuHeader}
      menuFooter={menuFooter}
      onOpenChange={setOpen}
    />
  );
}