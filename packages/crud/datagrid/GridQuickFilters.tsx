import { Chip } from '@nubitio/ui';
import { useCoreTranslation, type DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
import { fieldKeyValue, fieldTextValue } from '../form/fieldOptionSource';

/** Shortcuts into the grid query, never a filter over just the visible page. */
export function GridQuickFilters({
  fields,
  values,
  operators,
  remoteOptions,
  onChange,
}: {
  fields: Field[];
  values: Record<string, string>;
  operators: Record<string, string>;
  remoteOptions: Record<string, DataRecord[]>;
  onChange: (field: Field, values: Record<string, string>) => void;
}) {
  const { t } = useCoreTranslation();
  return fields.map((field) => {
    const items = field.type === FieldType.ENTITY ? remoteOptions[field.name] : field.data;
    const choices = (items ?? [])
      .map((item) => ({
        value: fieldKeyValue(field, item),
        label: fieldTextValue(field, item),
      }))
      .filter((item) => item.value != null && item.label);
    if (!choices.length) return null;
    const selected = operators[field.name] === '=' ? (values[field.name] ?? '') : '';
    // Keep the toolbar bounded; the filter sheet exposes the complete lookup.
    const visible = choices.filter(
      (choice, index) => index < 5 || String(choice.value) === selected,
    );
    return (
      <div
        key={field.name}
        className="nb-datagrid__quick-filters"
        role="group"
        aria-label={field.label}
      >
        <Chip
          label={t('grid.allFilter')}
          active={!values[field.name]}
          onClick={() => {
            const next = { ...values };
            delete next[field.name];
            onChange(field, next);
          }}
        />
        {visible.map((choice) => (
          <Chip
            key={String(choice.value)}
            label={choice.label}
            active={selected === String(choice.value)}
            onClick={() => {
              const next = { ...values };
              if (selected === String(choice.value)) delete next[field.name];
              else next[field.name] = String(choice.value);
              onChange(field, next);
            }}
          />
        ))}
      </div>
    );
  });
}
