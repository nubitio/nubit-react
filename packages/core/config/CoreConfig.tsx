import React from 'react';

export interface CoreConfig {
  locale: string;
  timezone: string;
  apiBaseUrl: string;
}

// Module-level defaults — readable by non-React code (DateUtils, serializeFormData, etc.).
// Updated by CoreConfigProvider on mount/change, or directly via configureCore().
const _coreConfig: CoreConfig = {
  locale: 'es',
  timezone: 'UTC',
  apiBaseUrl: '/api/',
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

const CoreConfigContext = React.createContext<CoreConfig>(_coreConfig);

export interface CoreConfigProviderProps {
  locale: string;
  timezone: string;
  apiBaseUrl: string;
  children: React.ReactNode;
}

export const CoreConfigProvider = ({
  locale,
  timezone,
  apiBaseUrl,
  children,
}: CoreConfigProviderProps) => {
  // Keep module-level config in sync so it is available to non-React code
  // (defineResource, entityField, DateUtils, etc.) even at module evaluation time.
  configureCore({ locale, timezone, apiBaseUrl });

  const value = React.useMemo(() => ({ locale, timezone, apiBaseUrl }), [locale, timezone, apiBaseUrl]);

  return (
    <CoreConfigContext.Provider value={value}>
      {children}
    </CoreConfigContext.Provider>
  );
};

export function useCoreConfig(): CoreConfig {
  return React.useContext(CoreConfigContext);
}
