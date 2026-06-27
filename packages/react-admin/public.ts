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
  getCoreCurrency,
  getMercureTopicOrigin,
  buildMercureCollectionTopic,
  resolveMercureTopicOrigin,
} from '@nubitio/core';
export type { CoreProviderProps, CoreConfigProviderProps, CoreConfig } from '@nubitio/core';

// ── HTTP ──────────────────────────────────────────────────────────────────────
export { useCoreHttpClient, createCoreHttpClient } from '@nubitio/core';
export type { CoreHttpClient, CoreHttpClientConfig } from '@nubitio/core';

// ── CRUD engine ───────────────────────────────────────────────────────────────
export {
  CrudPage,
  crudRoute,
  SchemaCrudPage,
  SmartCrudPage,
  SmartCrudRolesProvider,
  DevToolsProvider,
  useDevTools,
  isDevEnvironment,
  defineResource,
  embeddedLinesUrl,
  defineFields,
  defineFieldContract,
  validateFieldContract,
  useSmartCrudRoles,
  AuditTrailPanel,
} from '@nubitio/crud';
export type {
  SchemaCrudPageProps,
  SmartCrudPageProps,
  ResourceConfig,
  ResourcePermissions,
  ResourceRowActions,
  ResourceRouting,
  ResourceToolbar,
  ResourceToolbarAction,
  ResourceToolbarActionVariant,
  ResourceToolbarContext,
  ResourceToolbarItems,
  CrudGridSlotContext,
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
  DevToolsContextValue,
  ResourceDiagnostics,
  FieldResolutionSource,
  FormDetailDiagnostics,
  FormDetailFieldSource,
} from '@nubitio/crud';

// ── Field DSL ─────────────────────────────────────────────────────────────────
export {
  textField,
  buildFields,
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
export type { Field,
  FieldInput, FieldDef, LoadOption, EnumOption } from '@nubitio/crud';
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

// ── Dashboard ─────────────────────────────────────────────────────────────────
export {
  defineDashboard,
  DashboardPage,
  useDashboardData,
  statWidget,
  barChartWidget,
  donutChartWidget,
  tableWidget,
  resolvePath,
  resolveArray,
  formatDashboardValue,
} from '@nubitio/dashboard';
export type {
  BarChartWidgetConfig,
  DashboardConfig,
  DashboardDataResult,
  DashboardPageProps,
  DashboardSection,
  DashboardSectionLayout,
  DashboardWidget,
  DonutChartWidgetConfig,
  StatIconTone,
  StatWidgetConfig,
  TableColumnConfig,
  TableViewAllConfig,
  TableWidgetConfig,
  TrendConfig,
  ValueFormat,
} from '@nubitio/dashboard';

// ── Admin shell ───────────────────────────────────────────────────────────────
export {
  FeatureHubLayout,
  AdminShell,
  AdminHeader,
  AdminSidebarMenu,
  useScreenSize,
  useScreenSizeClass,
  SessionProvider,
  StaticSessionProvider,
  useSession,
  useFeature,
  useFeatureConfig,
  FeatureGate,
  QuotaUsageBanner,
  quotaUsageAboveGrid,
  parseQuotaError,
  quotaErrorToastMessage,
  useQuotaUsage,
  PlanPanel,
  LoginPage,
  RegisterPage,
  useAppRuntime,
  useRuntimeConfig,
  ToastHost,
  createNubitApp,
  filterMenuByRoles,
  hasAnyRole,
  NubitDevToolsPanel,
} from '@nubitio/admin';
export type {
  FeatureHubBanner,
  FeatureHubLayoutProps,
  FeatureHubTab,
  AdminShellProps,
  AdminMenuItem,
  AdminHeaderAction,
  AdminHeaderProps,
  AdminSidebarMenuProps,
  AdminMenuSubItem,
  AdminSidebarMenuSelectEvent,
  AppProfile,
  SessionFeatureEntitlement,
  SessionProfile,
  SessionState,
  SessionProviderConfig,
  SessionContextValue,
  SessionTenant,
  FeatureGateProps,
  QuotaUsageBannerProps,
  ParsedQuotaError,
  UseQuotaUsageOptions,
  PlanDefinition,
  PlanPanelLabels,
  PlanPanelProps,
  LoginPageProps,
  RegisterField,
  RegisterFieldType,
  RegisterPageProps,
  RegisterSelectOption,
  NotificationType,
  ToastItem,
  ToastHostProps,
  RuntimeConfig,
  RuntimeConfigState,
  UseRuntimeConfigOptions,
  CreateNubitAppConfig,
  NubitApp,
  NubitAppMenuContext,
  NubitAppMenuItem,
  NubitAppMenuSubItem,
  NubitAppRoute,
  NubitAppUserMenuContext,
} from '@nubitio/admin';

// ── i18n bootstrap ────────────────────────────────────────────────────────────
export { initCoreI18n } from '@nubitio/core';

// ── Backend adapters & data stores ────────────────────────────────────────────
export { RestAdapter, HydraAdapter, ResourceStoreProvider, createRestResourceStore } from '@nubitio/crud';
export type { BackendAdapter, ResourceStoreProviderProps, RestQueryDialect } from '@nubitio/crud';

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
  KpiMetricRow,
  SegmentedControl,
  FilterPanel,
  ScopeTabs,
  OperationCardGrid,
  HubPanel,
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
  Timeline,
  TimelineItem,
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
  KpiMetricItem,
  KpiMetricLayout,
  KpiMetricRowProps,
  KpiMetricTone,
  SegmentedControlOption,
  SegmentedControlProps,
  FilterPanelCategorySection,
  FilterPanelChipOption,
  FilterPanelProps,
  FilterPanelStatusSection,
  ScopeTabOption,
  ScopeTabsProps,
  OperationCardAccent,
  OperationCardGridProps,
  OperationCardItem,
  HubPanelProps,
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
  TimelineProps,
  TimelineItemProps,
  TimelineVariant,
  TimelineOrientation,
  TimelineItemStatus,
  TimelineItemTone,
  UiStrings,
  UiStringsProviderProps,
} from '@nubitio/ui';
