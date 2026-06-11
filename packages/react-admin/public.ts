/**
 * @nubit/react-admin — batteries-included admin stack.
 *
 * Umbrella re-export for fast project bootstrap. Import everything you need
 * for a typical API Platform admin app from this single package:
 *
 *   import { CoreProvider, CoreConfigProvider, CrudPage, AdminShell, SchemaProvider } from '@nubit/react-admin';
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
} from '@nubit/core';
export type { CoreProviderProps, CoreConfigProviderProps, CoreConfig } from '@nubit/core';

// ── HTTP ──────────────────────────────────────────────────────────────────────
export { useCoreHttpClient, createCoreHttpClient } from '@nubit/core';
export type { CoreHttpClient, CoreHttpClientConfig } from '@nubit/core';

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
} from '@nubit/crud';
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
} from '@nubit/crud';

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
} from '@nubit/crud';
export type { Field, FieldDef, LoadOption, EnumOption } from '@nubit/crud';
export type {
  FormatterFn,
  GridCellContext,
  GridOnChangeFn,
  FormOnChangeFn,
  OnChangeFn,
} from '@nubit/crud';

// ── Form & grid handles ───────────────────────────────────────────────────────
export type { FormHandle } from '@nubit/crud';
export type { GridHandle } from '@nubit/crud';
export { FormView, FORM_EVENTS } from '@nubit/crud';
export { DataGridView, DATA_GRID_EVENTS } from '@nubit/crud';
export { DialogView } from '@nubit/crud';

// ── Event bus ─────────────────────────────────────────────────────────────────
export { dispatch, useEvents } from '@nubit/core';
export { createCrudEvents } from '@nubit/crud';
export type { EventSubscription } from '@nubit/core';

// ── Locale / date ─────────────────────────────────────────────────────────────
export { DateUtils, getCoreLocale, getCoreTimezone } from '@nubit/core';
export { coreTranslationsEs, coreTranslationsEn } from '@nubit/core';
export type { CoreTranslationKeys } from '@nubit/core';

// ── Data ──────────────────────────────────────────────────────────────────────
export type { DataRecord } from '@nubit/core';

// ── Hydra Data Source ─────────────────────────────────────────────────────────
export { HydraRemoteDataSource } from '@nubit/hydra';
export type {
  RemoteDataSourceOptions,
  RemoteFilterDescriptor,
  RemoteLoadOptions,
  RemoteSortDescriptor,
} from '@nubit/hydra';

// ── Mercure (real-time) ───────────────────────────────────────────────────────
export { MercureProvider, useMercureHub, useMercureSubscription } from '@nubit/core';
export type { MercureProviderProps } from '@nubit/core';

// ── UI primitives ─────────────────────────────────────────────────────────────
export { AppDialog, AppDropdown, ConfirmDialog, AppToolbar, Card, ThemeProvider, ThemeContext, useTheme, ThemeSwitcher } from '@nubit/ui';
export type { AppDialogProps, AppDropdownOption, AppDropdownProps, AppDropdownVariant, ConfirmDialogProps, AppToolbarProps, CardProps, ThemeProviderProps, ThemeContextValue, Theme, ThemeMode, ThemeSwitcherProps } from '@nubit/ui';

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
} from '@nubit/hydra';
export type {
  UseSchemaContextResult,
  HydraApiDoc,
  OpenApiDoc,
  ApiDoc,
} from '@nubit/hydra';

// ── Admin shell ───────────────────────────────────────────────────────────────
export {
  AdminShell,
  AdminHeader,
  AdminSidebarMenu,
  useScreenSize,
  useScreenSizeClass,
} from '@nubit/admin';
export type {
  AdminShellProps,
  AdminMenuItem,
  AdminHeaderAction,
  AdminHeaderProps,
  AdminSidebarMenuProps,
  AdminMenuSubItem,
  AdminSidebarMenuSelectEvent,
} from '@nubit/admin';

// ── i18n bootstrap ────────────────────────────────────────────────────────────
export { initCoreI18n } from '@nubit/core';

// ── Backend adapters & data stores ────────────────────────────────────────────
export { RestAdapter, HydraAdapter, ResourceStoreProvider } from '@nubit/crud';
export type { BackendAdapter, ResourceStoreProviderProps } from '@nubit/crud';

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
} from '@nubit/ui';
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
} from '@nubit/ui';
