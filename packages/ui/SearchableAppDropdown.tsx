import { useCallback } from 'react';
import { AppDropdown, type AppDropdownOption, type AppDropdownProps } from './AppDropdown';
import { Combobox, type ComboboxOption } from './Combobox';
import type { ComboboxLoader } from './useComboboxOptions';

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

const toOption = (option: AppDropdownOption): ComboboxOption => ({
  value: option.value,
  label: option.selectedLabel ?? option.label,
  disabled: option.disabled,
  content: (
    <span className="nb-dropdown__option-content">
      {option.iconText && (
        <span className="nb-dropdown__option-icon" aria-hidden="true">
          {option.iconText}
        </span>
      )}
      {option.label}
    </span>
  ),
});

export function SearchableAppDropdown({
  options = [],
  searchable = true,
  searchPlaceholder = 'Buscar…',
  onSearch,
  minSearchLength = 2,
  emptySearchLabel = 'Sin resultados',
  loadingLabel = 'Buscando…',
  selectedOption,
  value,
  onChange,
  placeholder,
  disabled,
  label,
  showFieldLabel,
  variant,
  icon: _icon,
  menuMinWidth: _menuMinWidth,
  menuHeader: _header,
  menuFooter: _footer,
  ...rest
}: SearchableAppDropdownProps) {
  const loadOptions = useCallback<ComboboxLoader>(
    async (query, { signal }) => {
      const results = await onSearch!(query.trim());
      if (signal.aborted) throw new DOMException('Search cancelled', 'AbortError');
      return { options: results.map(toOption) };
    },
    [onSearch],
  );
  if (!searchable)
    return (
      <AppDropdown
        {...rest}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        label={label}
        showFieldLabel={showFieldLabel}
        variant={variant}
        icon={_icon}
        menuMinWidth={_menuMinWidth}
        menuHeader={_header}
        menuFooter={_footer}
      />
    );
  const seeds =
    selectedOption && !options.some((option) => option.value === selectedOption.value)
      ? [...options, selectedOption]
      : options;
  return (
    <Combobox
      {...rest}
      label={showFieldLabel === false ? undefined : label}
      aria-label={showFieldLabel === false && typeof label === 'string' ? label : undefined}
      placeholder={placeholder ?? searchPlaceholder}
      options={seeds.map(toOption)}
      value={value || null}
      onChange={(next) => onChange(next ?? '')}
      disabled={disabled}
      loadOptions={onSearch ? loadOptions : undefined}
      minSearchLength={minSearchLength}
      emptyMessage={emptySearchLabel}
      loadingMessage={loadingLabel}
    />
  );
}
