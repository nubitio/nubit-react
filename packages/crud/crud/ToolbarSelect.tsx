import { AppDropdown } from '@nubitio/ui';
import type { AppDropdownOption } from '@nubitio/ui';

export type ToolbarSelectOption = AppDropdownOption;

export interface ToolbarSelectProps {
  id: string;
  label: string;
  icon?: string;
  value: string;
  options: ToolbarSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** @deprecated Use `AppDropdown` with `variant="toolbar"` from `@nubitio/ui`. */
export function ToolbarSelect({
  id,
  label,
  icon = 'ph-funnel',
  value,
  options,
  onChange,
  disabled = false,
}: ToolbarSelectProps) {
  return (
    <AppDropdown
      id={id}
      label={label}
      icon={icon}
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      variant="toolbar"
      showFieldLabel={false}
    />
  );
}