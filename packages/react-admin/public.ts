/**
 * @nubitio/react-admin — batteries-included admin stack.
 *
 * Umbrella re-export for fast project bootstrap. Import everything you need
 * for a typical API Platform admin app from this single package:
 *
 *   import { CoreProvider, CoreConfigProvider, CrudPage, AdminShell, SchemaProvider } from '@nubitio/react-admin';
 *
 * Peer dependencies: react, react-dom, react-router-dom, @tanstack/react-query,
 *                    i18next, react-i18next.
 */

// ── Runtime setup ─────────────────────────────────────────────────────────────
export {
  CoreProvider,
  CoreConfigProvider,
  useCoreConfig,
  configureCore,
  configureCoreDate, // deprecated
  getCoreApiBaseUrl,
} from '@nubitio/core';
export type { CoreProviderProps, CoreConfigProviderProps, CoreConfig } from '@nubitio/core';

// ── HTTP ──────────────────────────────────────────────────────────────────────
export { useCoreHttpClient, createCoreHttpClient } from '@nubitio/core';
export type { CoreHttpClient, CoreHttpClientConfig } from '@nubitio/core';

// ── CRUD engine ───────────────────────────────────────────────────────────────
export {
  CrudPage,
  SmartCrudPage,
  SmartCrudRolesProvider,
  defineResource,
  defineFields,
  defineFieldContract,
  validateFieldContract,
  useSmartCrudRoles,
  AuditTrailPanel,
} from '@nubitio/crud';
export type {
  ResourceConfig,
  ResourcePermissions,
  ResourceRowActions,
  ResourceRouting,
  ResourceToolbar,
  ResourceToolbarAction,
  ResourceToolbarActionVariant,
  ResourceToolbarContext,
  ResourceToolbarItems,
  ResourceGridDetail,
  ResourceFormDetail,
  BulkAction,
  ColumnPreset,
  FormLayout,
  FormSection,
  FormTab,
  SmartCrudFieldContract,
  SmartCrudFieldOperation,
  SmartCrudFieldPatch,
  SmartCrudHydraFieldContract,
  SmartCrudHydraFieldDirective,
  SmartCrudManualField,
  SmartCrudManualFieldContract,
  SmartCrudOperation,
  AuditEntry,
  AuditTrailConfig,
  AuditTrailPanelProps,
  ResourceSchemaResolver,
  ResourceStore,
  ResourceStoreFactory,
  FieldOverride,
} from '@nubitio/crud';

// ── Field DSL ─────────────────────────────────────────────────────────────────
export {
  textField,
  textareaField,
  numberField,
  currencyField,
  dateField,
  datetimeField,
  entityField,
  enumField,
  selectField,
  checkboxField,
  switchField,
  fileField,
  ToolbarSelect,
  DrawerView,
  ColumnPresetSelector,
  useColumnPreset,
  imageField,
  passwordField,
  identityField,
  noneField,
  FieldBuilder,
} from '@nubitio/crud';
export type { Field, FieldDef, LoadOption, EnumOption } from '@nubitio/crud';
export type {
  FormatterFn,
  GridCellContext,
  GridOnChangeFn,
  FormOnChangeFn,
  OnChangeFn,
} from '@nubitio/crud';

// ── Form & grid handles ───────────────────────────────────────────────────────
export type { FormHandle } from '@nubitio/crud';
export type { GridHandle } from '@nubitio/crud';
export { FormView, FORM_EVENTS } from '@nubitio/crud';
export { DataGridView, DATA_GRID_EVENTS } from '@nubitio/crud';
export { DialogView } from '@nubitio/crud';

// ── Event bus ─────────────────────────────────────────────────────────────────
export { dispatch, useEvents } from '@nubitio/core';
export { createCrudEvents } from '@nubitio/crud';
export type { EventSubscription } from '@nubitio/core';

// ── Locale / date ─────────────────────────────────────────────────────────────
export { DateUtils, getCoreLocale, getCoreTimezone } from '@nubitio/core';
export { coreTranslationsEs, coreTranslationsEn } from '@nubitio/core';
export type { CoreTranslationKeys } from '@nubitio/core';

// ── Data ──────────────────────────────────────────────────────────────────────
export type { DataRecord } from '@nubitio/core';

// ── Hydra Data Source ─────────────────────────────────────────────────────────
export { HydraRemoteDataSource } from '@nubitio/hydra';
export type {
  RemoteDataSourceOptions,
  RemoteFilterDescriptor,
  RemoteLoadOptions,
  RemoteSortDescriptor,
} from '@nubitio/hydra';

// ── Mercure (real-time) ───────────────────────────────────────────────────────
export { MercureProvider, useMercureHub, useMercureSubscription } from '@nubitio/core';
export type { MercureProviderProps } from '@nubitio/core';

// ── UI primitives ─────────────────────────────────────────────────────────────
export { AppDialog, AppDropdown, ConfirmDialog, AppToolbar, Card, ThemeProvider, ThemeContext, useTheme, ThemeSwitcher } from '@nubitio/ui';
export type { AppDialogProps, AppDropdownOption, AppDropdownProps, AppDropdownVariant, ConfirmDialogProps, AppToolbarProps, CardProps, ThemeProviderProps, ThemeContextValue, Theme, ThemeMode, ThemeSwitcherProps } from '@nubitio/ui';

// ── Hydra/OpenAPI adapter ─────────────────────────────────────────────────────
export {
  SchemaProvider,
  useSchemaContext,
  useHydraMetadata,
  useResourceSchema,
  HydraResourceSchemaProvider,
  HydraResourceStoreProvider,
  parseHydraDoc,
  parseOpenApiDoc,
  mapHydraSchemaToFields,
  resolveRangeTag,
} from '@nubitio/hydra';
export type {
  UseSchemaContextResult,
  HydraApiDoc,
  OpenApiDoc,
  ApiDoc,
} from '@nubitio/hydra';

// ── Admin shell ───────────────────────────────────────────────────────────────
export {
  AdminShell,
  AdminHeader,
  AdminSidebarMenu,
  useScreenSize,
  useScreenSizeClass,
} from '@nubitio/admin';
export type {
  AdminShellProps,
  AdminMenuItem,
  AdminHeaderAction,
  AdminHeaderProps,
  AdminSidebarMenuProps,
  AdminMenuSubItem,
  AdminSidebarMenuSelectEvent,
} from '@nubitio/admin';

// ── i18n bootstrap ────────────────────────────────────────────────────────────
export { initCoreI18n } from '@nubitio/core';

// ── Backend adapters & data stores ────────────────────────────────────────────
export { RestAdapter, HydraAdapter, ResourceStoreProvider } from '@nubitio/crud';
export type { BackendAdapter, ResourceStoreProviderProps } from '@nubitio/crud';

// ── UI primitives & localization ──────────────────────────────────────────────
export {
  Avatar,
  Badge,
  Button,
  IconButton,
  Chip,
  Toggle,
  Skeleton,
  EmptyState,
  StatCard,
  Drawer,
  Popover,
  ContextMenu,
  CollapsibleSection,
  DatePicker,
  DateRangePicker,
  FormField,
  TextField,
  TextAreaField,
  SelectField,
  DensityProvider,
  useDensity,
  SettingsPanel,
  useAccentColor,
  ACCENT_PRESETS,
  UiStringsProvider,
  useUiStrings,
  EN_UI_STRINGS,
  ES_UI_STRINGS,
} from '@nubitio/ui';
export type {
  AvatarProps,
  BadgeProps,
  ButtonProps,
  IconButtonProps,
  ChipProps,
  ToggleProps,
  SkeletonProps,
  EmptyStateProps,
  StatCardProps,
  DrawerProps,
  DrawerSide,
  PopoverProps,
  ContextMenuProps,
  ContextMenuItem,
  CollapsibleSectionProps,
  DatePickerProps,
  DateRangePickerProps,
  FormFieldProps,
  TextFieldProps,
  TextAreaFieldProps,
  SelectFieldProps,
  Density,
  SettingsPanelProps,
  AccentPreset,
  UiStrings,
  UiStringsProviderProps,
} from '@nubitio/ui';
