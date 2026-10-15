import { useOverlayContainer } from './OverlayContainer';
import {
  Button as AriaButton,
  ComboBox as AriaCombobox,
  ComboBoxStateContext,
  ComboBoxValue,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Tag,
  TagGroup,
  TagList,
} from 'react-aria-components';
import { forwardRef, useContext, useId, useState } from 'react';
import type { ForwardedRef, InputHTMLAttributes, ReactNode } from 'react';
import { useUiStrings } from './UiStrings';
import { useComboboxOptions } from './useComboboxOptions';
import type { ComboboxLoader } from './useComboboxOptions';
import './FormControls.scss';
import './Combobox.scss';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Optional rich option content; label remains the plain-text accessible name. */
  content?: ReactNode;
}

export interface ComboboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'children'
> {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  label?: ReactNode;
  error?: ReactNode;
  helpText?: ReactNode;
  invalid?: boolean;
  clearable?: boolean;
  emptyMessage?: ReactNode;
  openLabel?: string;
  clearLabel?: string;
  /** Styles the input independently from the field wrapper. */
  inputClassName?: string;
  /** Server filtering/paging. Seed options should include selected records. */
  loadOptions?: ComboboxLoader;
  debounceMs?: number;
  minSearchLength?: number;
  loadingMessage?: ReactNode;
  searchErrorMessage?: ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export interface MultiSelectProps extends Omit<ComboboxProps, 'value' | 'onChange'> {
  value: string[];
  onChange: (value: string[]) => void;
  selectedLabel?: string;
  removeLabel?: (option: ComboboxOption) => string;
}

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(props, ref) {
  return (
    <SelectionCombobox
      {...props}
      inputRef={ref}
      multiple={false}
      onChange={(value) => props.onChange(typeof value === 'string' ? value : null)}
    />
  );
});

export const MultiSelect = forwardRef<HTMLInputElement, MultiSelectProps>(
  function MultiSelect(props, ref) {
    return (
      <SelectionCombobox
        {...props}
        inputRef={ref}
        multiple
        onChange={(value) => props.onChange(Array.isArray(value) ? value : [])}
      />
    );
  },
);

type SelectionProps = Omit<MultiSelectProps, 'value' | 'onChange'> & {
  multiple: boolean;
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  inputRef: ForwardedRef<HTMLInputElement>;
};

function SelectionCombobox({
  options,
  value,
  onChange,
  label,
  error,
  helpText,
  invalid = false,
  clearable = true,
  emptyMessage,
  openLabel,
  clearLabel,
  id,
  name,
  disabled,
  readOnly,
  required,
  form,
  className,
  inputClassName,
  'aria-describedby': describedBy,
  loadOptions,
  debounceMs = 250,
  minSearchLength = 0,
  loadingMessage,
  searchErrorMessage,
  onOpenChange,
  multiple,
  inputRef,
  selectedLabel,
  removeLabel,
  ...inputProps
}: SelectionProps) {
  const overlayContainer = useOverlayContainer();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const strings = useUiStrings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = Array.isArray(value) ? value : value === null ? [] : [value];
  const remote = useComboboxOptions({
    options,
    selected,
    loadOptions,
    open: open && !disabled && !readOnly,
    query,
    debounceMs,
    minSearchLength,
  });
  const message = error ?? helpText;
  const messageId = `${inputId}-message`;
  const description =
    [describedBy, message ? messageId : undefined].filter(Boolean).join(' ') || undefined;
  const selectedOptions = selected.map(
    (key) => remote.known.find((option) => option.value === key) ?? { value: key, label: key },
  );
  const remoteStatus = remote.failed
    ? (searchErrorMessage ?? strings.searchFailed)
    : remote.loading
      ? (loadingMessage ?? strings.searching)
      : !remote.eligible && loadOptions
        ? strings.enterSearch
        : undefined;

  return (
    <AriaCombobox<ComboboxOption, 'single' | 'multiple'>
      {...(loadOptions ? { items: remote.items } : { defaultItems: options })}
      selectionMode={multiple ? 'multiple' : 'single'}
      value={value}
      onChange={(keys) =>
        onChange(Array.isArray(keys) ? keys.map(String) : keys === null ? null : String(keys))
      }
      onInputChange={setQuery}
      onOpenChange={(nextOpen, trigger) => {
        setOpen(nextOpen);
        onOpenChange?.(nextOpen);
        if (!nextOpen || trigger !== 'input') setQuery('');
      }}
      name={name}
      form={form}
      isDisabled={disabled}
      isReadOnly={readOnly}
      isRequired={required}
      isInvalid={invalid || !!error}
      allowsEmptyCollection
      aria-label={inputProps['aria-label']}
      aria-labelledby={inputProps['aria-labelledby']}
      className={`nb-form-field${className ? ` ${className}` : ''}`}
    >
      {label && <Label className="nb-form-field__label">{label}</Label>}
      <div className="nb-combobox">
        <Input
          {...inputProps}
          ref={inputRef}
          id={inputId}
          className={`nb-input nb-combobox__input${invalid || error ? ' nb-input--invalid' : ''}${inputClassName ? ` ${inputClassName}` : ''}`}
          onKeyDown={(event) => {
            inputProps.onKeyDown?.(event);
            // Let React Aria close its popup, but keep the same Escape from
            // reaching a surrounding dialog's document-level listener.
            if (open && event.key === 'Escape') event.stopPropagation();
            if (!event.defaultPrevented && event.key === 'PageDown' && remote.hasMore) {
              event.preventDefault();
              void remote.loadMore();
            }
          }}
          aria-invalid={inputProps['aria-invalid'] ?? (invalid || !!error || undefined)}
          aria-describedby={description}
        />
        <div className="nb-combobox__actions">
          {clearable && !readOnly && (
            <ComboboxClear
              label={clearLabel ?? strings.clear}
              disabled={disabled}
              multiple={multiple}
            />
          )}
          <AriaButton className="nb-combobox__action" aria-label={openLabel ?? strings.openOptions}>
            <span aria-hidden="true">⌄</span>
          </AriaButton>
        </div>
      </div>
      {multiple && selectedOptions.length > 0 && (
        <ComboBoxValue>
          {() => (
            <TagGroup
              aria-label={selectedLabel ?? strings.selectedOptions}
              onRemove={
                disabled || readOnly
                  ? undefined
                  : (keys) => onChange(selected.filter((key) => !keys.has(key)))
              }
              className="nb-combobox-tags"
            >
              <TagList items={selectedOptions}>
                {(option) => (
                  <Tag id={option.value} textValue={option.label} className="nb-combobox-tags__tag">
                    {option.label}
                    {!disabled && !readOnly && (
                      <AriaButton
                        slot="remove"
                        className="nb-combobox-tags__remove"
                        aria-label={removeLabel?.(option) ?? strings.removeOption}
                      >
                        <span aria-hidden="true">×</span>
                      </AriaButton>
                    )}
                  </Tag>
                )}
              </TagList>
            </TagGroup>
          )}
        </ComboBoxValue>
      )}
      <Popover
        UNSTABLE_portalContainer={overlayContainer ?? undefined}
        className="nb-combobox-popup"
        offset={4}
        isNonModal
        onScroll={(event) => {
          const panel = event.currentTarget;
          if (panel.scrollHeight - panel.scrollTop <= panel.clientHeight + 20)
            void remote.loadMore();
        }}
      >
        {remoteStatus && (
          <div className="nb-combobox-popup__empty" role={remote.failed ? 'alert' : 'status'}>
            {remoteStatus}
          </div>
        )}
        <ListBox
          className="nb-combobox-popup__list"
          aria-busy={remote.loading || undefined}
          renderEmptyState={() =>
            remoteStatus ? null : (
              <div className="nb-combobox-popup__empty">{emptyMessage ?? strings.noOptions}</div>
            )
          }
        >
          {(option: ComboboxOption) => (
            <ListBoxItem
              id={option.value}
              textValue={option.label}
              isDisabled={option.disabled}
              className="nb-combobox-popup__item"
            >
              {({ isSelected }) => (
                <>
                  <span className="nb-combobox-popup__indicator" aria-hidden="true">
                    {isSelected ? '✓' : ''}
                  </span>
                  {option.content ?? option.label}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
        {remote.hasMore && !remote.failed && (
          <AriaButton
            slot={null}
            className="nb-combobox__action"
            isDisabled={remote.loading}
            onPress={() => {
              void remote.loadMore();
            }}
          >
            {strings.loadMore}
          </AriaButton>
        )}
        {remote.failed && (
          <AriaButton className="nb-combobox__action" onPress={remote.retry}>
            {strings.retrySearch}
          </AriaButton>
        )}
      </Popover>
      {message && (
        <span
          id={messageId}
          className={error ? 'nb-form-field__error' : 'nb-form-field__help'}
          role={error ? 'alert' : undefined}
        >
          {message}
        </span>
      )}
    </AriaCombobox>
  );
}

function ComboboxClear({
  label,
  disabled,
  multiple,
}: {
  label: string;
  disabled?: boolean;
  multiple: boolean;
}) {
  const state = useContext(ComboBoxStateContext);
  const hasValue = multiple
    ? Array.isArray(state?.value) && state.value.length > 0
    : !!state?.inputValue;
  if (!state || !hasValue || state.isOpen) return null;
  return (
    <AriaButton
      slot={null}
      isDisabled={disabled}
      className="nb-combobox__action"
      aria-label={label}
      onPress={() => {
        state.setValue(multiple ? [] : null);
        state.setInputValue('');
      }}
    >
      <span aria-hidden="true">×</span>
    </AriaButton>
  );
}
