import React from 'react';

export interface CoreConfig {
  locale: string;
  timezone: string;
  apiBaseUrl: string;
  /**
   * ISO 4217 currency code used as the app-wide default by money formatters
   * (e.g. summary `valueFormat: 'currency'`). No library default: when unset,
   * formatters that need a currency fall back to plain fixed-point output.
   */
  currency?: string;
  /**
   * Escape hatch for Mercure collection topic URIs when autodiscovery from
   * Hydra `@id` cannot infer the API origin (e.g. relative IRIs only).
   */
  mercureTopicOrigin?: string;
}

// Module-level defaults — readable by non-React code (DateUtils, serializeFormData, etc.).
// Updated by CoreConfigProvider on mount/change, or directly via configureCore().
const _coreConfig: CoreConfig = {
  locale: 'es',
  timezone: 'UTC',
  apiBaseUrl: '/api/',
  currency: undefined,
  mercureTopicOrigin: undefined,
};

/**
 * Configure core runtime values (locale, timezone, apiBaseUrl).
 * This updates the module-level singleton so it can be read from non-React code
 * (e.g. inside defineResource, entityField builders, DateUtils, etc.).
 */
export function configureCore(config: Partial<CoreConfig>): void {
  if (config.locale !== undefined) _coreConfig.locale = config.locale;
  if (config.timezone !== undefined) _coreConfig.timezone = config.timezone;
  if (config.apiBaseUrl !== undefined) _coreConfig.apiBaseUrl = config.apiBaseUrl;
  if ('currency' in config) _coreConfig.currency = config.currency;
  if ('mercureTopicOrigin' in config) _coreConfig.mercureTopicOrigin = config.mercureTopicOrigin;
}

/**
 * @deprecated Use configureCore() instead.
 */
export const configureCoreDate = configureCore;

export function getCoreLocale(): string {
  return _coreConfig.locale;
}

export function getCoreTimezone(): string {
  return _coreConfig.timezone;
}

export function getCoreApiBaseUrl(): string {
  return _coreConfig.apiBaseUrl;
}

/** App-wide default currency (ISO 4217), or undefined when not configured. */
export function getCoreCurrency(): string | undefined {
  return _coreConfig.currency;
}

export function getMercureTopicOrigin(): string | undefined {
  return _coreConfig.mercureTopicOrigin;
}

const CoreConfigContext = React.createContext<CoreConfig>(_coreConfig);

export interface CoreConfigProviderProps {
  locale: string;
  timezone: string;
  apiBaseUrl: string;
  /** ISO 4217 app-wide default currency for money formatters (e.g. 'PEN', 'USD'). */
  currency?: string;
  /** Mercure topic origin override — see {@link CoreConfig.mercureTopicOrigin}. */
  mercureTopicOrigin?: string;
  children: React.ReactNode;
}

export const CoreConfigProvider = ({
  locale,
  timezone,
  apiBaseUrl,
  currency,
  mercureTopicOrigin,
  children,
}: CoreConfigProviderProps) => {
  // Keep module-level config in sync so it is available to non-React code
  // (defineResource, entityField, DateUtils, etc.) even at module evaluation time.
  configureCore({ locale, timezone, apiBaseUrl, currency, mercureTopicOrigin });

  const value = React.useMemo(
    () => ({ locale, timezone, apiBaseUrl, currency, mercureTopicOrigin }),
    [locale, timezone, apiBaseUrl, currency, mercureTopicOrigin],
  );

  return (
    <CoreConfigContext.Provider value={value}>
      {children}
    </CoreConfigContext.Provider>
  );
};

export function useCoreConfig(): CoreConfig {
  return React.useContext(CoreConfigContext);
}
