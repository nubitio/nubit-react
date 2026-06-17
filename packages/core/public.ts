// ── Base data types ───────────────────────────────────────────────────────────
export type { DataRecord } from './data/DataRecord';
export type { GridData } from './data/GridData';

// ── Date utilities ────────────────────────────────────────────────────────────
export { DateUtils, DEFAULT_TIMEZONE } from './date';

// ── Core config ───────────────────────────────────────────────────────────────
export {
  CoreConfigProvider,
  configureCore,
  configureCoreDate, // deprecated alias
  getCoreLocale,
  getCoreTimezone,
  getCoreApiBaseUrl,
  getCoreCurrency,
  getMercureTopicOrigin,
  useCoreConfig,
} from './config/CoreConfig';
export type { CoreConfig, CoreConfigProviderProps } from './config/CoreConfig';

// ── Event primitives ──────────────────────────────────────────────────────────
export { dispatch, useEvents } from './event/EventHook';
export type { EventSubscription } from './event/EventHook';
export { createCrudEvents } from './event/createCrudEvents';
export { createScopedEventBus } from './event/createScopedEventBus';
export type { ScopedFormEventNames } from './event/createScopedEventBus';
export type {
  DataGridEventNames,
  DialogEventNames,
  FormEventNames,
  ToolbarButtonItem,
} from './event/EventTypes';

// ── I18n ──────────────────────────────────────────────────────────────────────
export {
  coreTranslationsEs,
  coreTranslationsEn,
  initCoreI18n,
  useCoreTranslation,
} from './i18n';
export type { CoreTranslationKeys } from './i18n';

// ── Provider ──────────────────────────────────────────────────────────────────
export { CoreProvider } from './provider';
export type { CoreProviderProps } from './provider';

// ── HTTP ──────────────────────────────────────────────────────────────────────
export {
  CoreHttpClient,
  CoreHttpProvider,
  createCoreHttpClient,
  useCoreHttpClient,
} from './http';
export type {
  CoreHttpClientConfig,
  CoreHttpError,
  CoreHttpErrorData,
  CoreHttpProviderProps,
  CoreHttpResponse,
  CoreRequestConfig,
  CoreResponseType,
} from './http';

// ── Runtime ───────────────────────────────────────────────────────────────────
export { CoreRuntimeProvider, useCoreRuntime } from './runtime';
export type { CoreNotificationType, CoreRuntime, CoreRuntimeProviderProps } from './runtime';

// ── Mercure (real-time) ───────────────────────────────────────────────────────
export {
  MercureProvider,
  MercureManager,
  buildMercureCollectionTopic,
  resolveMercureTopicOrigin,
  useMercureHub,
  useMercureSubscription,
} from './mercure';
export type { MercureProviderProps, MercureManagerType } from './mercure';
