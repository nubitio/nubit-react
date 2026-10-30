import { Combobox } from '@nubitio/ui';
import { useCoreTranslation } from '@nubitio/core';
import type { Field } from '../field/Field';

export { NativeEntitySelect } from './EntityCombobox';

export function NativeEnumSelect({
  className,
  disabled,
  invalid,
  describedBy,
  field,
  id,
  onChange,
  readOnly,
  required,
  value,
}: {
  className: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  field: Field;
  id?: string;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  required?: boolean;
  value: unknown;
}) {
  const { t } = useCoreTranslation();
  const items = field.data ?? [];
  return (
    <Combobox
      id={id}
      invalid={invalid}
      aria-describedby={describedBy}
      aria-label={field.label}
      inputClassName={className}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      options={items.map((item) => ({
        value: String(item['value'] ?? ''),
        label: String(item['text'] ?? item['value'] ?? ''),
      }))}
      value={value == null ? null : String(value)}
      onChange={(key) =>
        onChange(
          key === null
            ? null
            : (items.find((item) => String(item['value'] ?? '') === key)?.['value'] ?? key),
        )
      }
      openLabel={t('form.lookupOpen', { label: field.label })}
      clearLabel={t('form.lookupClear', { label: field.label })}
      emptyMessage={t('form.lookupNoResults')}
    />
  );
}
