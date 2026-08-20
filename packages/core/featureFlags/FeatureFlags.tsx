import React, { createContext, useContext, useMemo } from 'react';

export interface FeatureFlagEvaluationContext {
  targetingKey?: string;
  tenantId?: number;
  tenantName?: string;
  attributes?: Readonly<Record<string, boolean | number | string | null>>;
}

export type FeatureFlagValues = Readonly<Record<string, unknown>>;

export interface FeatureFlagClient {
  getBooleanValue(key: string, defaultValue: boolean): boolean;
  getStringValue(key: string, defaultValue: string): string;
  getNumberValue(key: string, defaultValue: number): number;
  getObjectValue<T extends object>(key: string, defaultValue: T): T;
}

export class StaticFeatureFlagClient implements FeatureFlagClient {
  constructor(
    private readonly flags: FeatureFlagValues = {},
    readonly context: FeatureFlagEvaluationContext = {},
  ) {}

  getBooleanValue(key: string, defaultValue: boolean): boolean {
    const value = this.flags[key];
    return typeof value === 'boolean' ? value : defaultValue;
  }

  getStringValue(key: string, defaultValue: string): string {
    const value = this.flags[key];
    return typeof value === 'string' ? value : defaultValue;
  }

  getNumberValue(key: string, defaultValue: number): number {
    const value = this.flags[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
  }

  getObjectValue<T extends object>(key: string, defaultValue: T): T {
    const value = this.flags[key];
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as T)
      : defaultValue;
  }
}

const defaultClient = new StaticFeatureFlagClient();
const FeatureFlagsContext = createContext<FeatureFlagClient>(defaultClient);

export interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  client?: FeatureFlagClient;
  flags?: FeatureFlagValues;
  context?: FeatureFlagEvaluationContext;
}

export function FeatureFlagsProvider({
  children,
  client,
  flags = {},
  context = {},
}: FeatureFlagsProviderProps) {
  const value = useMemo(
    () => client ?? new StaticFeatureFlagClient(flags, context),
    [client, context, flags],
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlagClient {
  return useContext(FeatureFlagsContext);
}

export function useBooleanFlag(key: string, defaultValue = false): boolean {
  return useFeatureFlags().getBooleanValue(key, defaultValue);
}

export function useStringFlag(key: string, defaultValue = ''): string {
  return useFeatureFlags().getStringValue(key, defaultValue);
}

export function useNumberFlag(key: string, defaultValue = 0): number {
  return useFeatureFlags().getNumberValue(key, defaultValue);
}

export function useObjectFlag<T extends object>(key: string, defaultValue: T): T {
  return useFeatureFlags().getObjectValue(key, defaultValue);
}
