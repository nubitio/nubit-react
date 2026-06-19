// @nubitio/admin — Admin panel shell: layout, header, sidebar, footer slots.
// Import from this facade only; do not reach into implementation paths.

export { AdminShell } from './AdminShell';
export type { AdminShellProps, AdminMenuItem, AdminHeaderAction } from './AdminShell';

export { AdminHeader } from './AdminHeader';
export type { AdminHeaderProps } from './AdminHeader';

export { AdminSidebarMenu } from './AdminSidebarMenu';
export type { AdminSidebarMenuProps, AdminMenuSubItem, AdminSidebarMenuSelectEvent } from './AdminSidebarMenu';

export { useScreenSize, useScreenSizeClass } from './useScreenSize';

export { SessionProvider, StaticSessionProvider, useSession } from './auth/SessionContext';
export { useFeature, useFeatureConfig } from './hooks/useFeature';
export { FeatureGate } from './features/FeatureGate';
export type { FeatureGateProps } from './features/FeatureGate';
export { QuotaUsageBanner, quotaUsageAboveGrid } from './quota/QuotaUsageBanner';
export type { QuotaUsageBannerProps } from './quota/QuotaUsageBanner';
export { PlanPanel } from './billing/PlanPanel';
export type { PlanDefinition, PlanPanelLabels, PlanPanelProps } from './billing/PlanPanel';
export { parseQuotaError, quotaErrorToastMessage } from './quota/parseQuotaError';
export type { ParsedQuotaError } from './quota/parseQuotaError';
export { useQuotaUsage } from './quota/useQuotaUsage';
export type { UseQuotaUsageOptions } from './quota/useQuotaUsage';
export type {
  AppProfile,
  SessionFeatureEntitlement,
  SessionProfile,
  SessionState,
  SessionProviderConfig,
  SessionContextValue,
  SessionTenant,
} from './auth/SessionContext';

export { LoginPage } from './auth/LoginPage';
export type { LoginPageProps } from './auth/LoginPage';

export { RegisterPage } from './auth/RegisterPage';
export type {
  RegisterField,
  RegisterFieldType,
  RegisterPageProps,
  RegisterSelectOption,
} from './auth/RegisterPage';

export { useAppRuntime } from './runtime/useAppRuntime';
export type { NotificationType, ToastItem } from './runtime/useAppRuntime';
export { useRuntimeConfig } from './runtime/useRuntimeConfig';
export type {
  RuntimeConfig,
  RuntimeConfigState,
  UseRuntimeConfigOptions,
} from './runtime/useRuntimeConfig';

export { ToastHost } from './runtime/ToastHost';
export type { ToastHostProps } from './runtime/ToastHost';

export { createNubitApp } from './app/createNubitApp';
export { filterMenuByRoles, hasAnyRole } from './app/filterMenuByRoles';
export type {
  CreateNubitAppConfig,
  NubitApp,
  NubitAppMenuContext,
  NubitAppMenuItem,
  NubitAppMenuSubItem,
  NubitAppRoute,
  NubitAppUserMenuContext,
} from './app/types';
