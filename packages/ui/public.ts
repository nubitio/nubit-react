// @nubitio/ui — visual primitives facade.
// Static design tokens ship inside dist/style.css; theme-dependent color
// tokens load at runtime via ThemeProvider (dist/themes/nb-theme-*.css).
import './theme/styles/tokens.scss';
import './foundations/base.scss';
import './foundations/scrollbars.scss';

export { Avatar, getAvatarInitials, getAvatarHue } from './Avatar';
export type { AvatarProps, AvatarShape, AvatarSize } from './Avatar';
export { AppDialog } from './AppDialog';
export type { AppDialogProps } from './AppDialog';
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';
export { AppToolbar } from './AppToolbar';
export type { AppToolbarProps } from './AppToolbar';
export { Button, IconButton } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant, IconButtonProps } from './Button';
export { Card } from './Card';
export type { CardProps } from './Card';
export { FormField, SelectField, TextAreaField, TextField } from './FormControls';
export type { FormFieldProps, SelectFieldProps, TextAreaFieldProps, TextFieldProps } from './FormControls';
export { FileDropzone } from './FileDropzone';
export type { FileDropzoneLabels, FileDropzoneProps, FileDropzoneValue } from './FileDropzone';
export { AppDropdown } from './AppDropdown';
export type { AppDropdownOption, AppDropdownProps, AppDropdownVariant } from './AppDropdown';
export { SearchableAppDropdown } from './SearchableAppDropdown';
export type { SearchableAppDropdownProps } from './SearchableAppDropdown';
export { ThemeProvider, ThemeContext, useTheme } from './theme/ThemeProvider';
export type { ThemeProviderProps, ThemeContextValue, Theme, ThemeMode } from './theme/ThemeProvider';
export { ThemeSwitcher } from './theme/ThemeSwitcher';
export type { ThemeSwitcherProps } from './theme/ThemeSwitcher';
export { DensityProvider, DensityContext, useDensity } from './theme/DensityProvider';
export type { DensityContextValue, Density } from './theme/DensityProvider';
export { useAccentColor, ACCENT_PRESETS } from './theme/useAccentColor';
export type { AccentPreset } from './theme/useAccentColor';
export { SettingsPanel } from './SettingsPanel';
export type { SettingsPanelProps } from './SettingsPanel';
export { FeatureGate } from './FeatureGate';
export type { FeatureGateProps } from './FeatureGate';
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';
export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { Chip } from './Chip';
export type { ChipProps } from './Chip';
export { Toggle } from './Toggle';
export type { ToggleProps } from './Toggle';
export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';
export { KpiMetricRow } from './KpiMetricRow';
export type {
  KpiMetricDensity,
  KpiMetricItem,
  KpiMetricLayout,
  KpiMetricRowProps,
  KpiMetricTone,
} from './KpiMetricRow';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlOption, SegmentedControlProps } from './SegmentedControl';
export { FilterPanel } from './FilterPanel';
export type {
  FilterPanelCategorySection,
  FilterPanelChipOption,
  FilterPanelDensity,
  FilterPanelLayout,
  FilterPanelProps,
  FilterPanelStatusSection,
} from './FilterPanel';
export { ScopeTabs } from './ScopeTabs';
export type { ScopeTabOption, ScopeTabsDensity, ScopeTabsProps } from './ScopeTabs';
export { OperationCardGrid } from './OperationCardGrid';
export type {
  OperationCardAccent,
  OperationCardGridProps,
  OperationCardItem,
} from './OperationCardGrid';
export { HubPanel } from './HubPanel';
export type { HubPanelProps, HubPanelVariant } from './HubPanel';
export { ContextMenu } from './ContextMenu';
export type { ContextMenuProps, ContextMenuItem } from './ContextMenu';
export { CollapsibleSection } from './CollapsibleSection';
export type { CollapsibleSectionProps } from './CollapsibleSection';
export { DatePicker } from './DatePicker';
export type { DatePickerProps } from './DatePicker';
export { DateRangePicker } from './DateRangePicker';
export type { DateRangePickerProps } from './DateRangePicker';
export { Popover } from './Popover';
export type { PopoverProps, PopoverAlign } from './Popover';
export { useFloatingPanel } from './useFloatingPanel';
export type { UseFloatingPanelOptions, UseFloatingPanelResult } from './useFloatingPanel';
export { Drawer } from './Drawer';
export type { DrawerProps, DrawerSide } from './Drawer';
export { Timeline, TimelineItem } from './Timeline';
export type {
  TimelineProps,
  TimelineItemProps,
  TimelineVariant,
  TimelineOrientation,
  TimelineItemStatus,
  TimelineItemTone,
} from './Timeline';
export { UiStringsProvider, useUiStrings, EN_UI_STRINGS, ES_UI_STRINGS } from './UiStrings';
export type { UiStrings, UiStringsProviderProps } from './UiStrings';
