/**
 * SchemaContext — shared parsed schema, no per-page re-fetch.
 *
 * Provides a single shared `useHydraMetadata()` call at the provider level
 * so that multiple `SchemaCrudPage` instances mounted simultaneously share
 * one `/api/docs.jsonld` request instead of each issuing their own.
 *
 * ## Usage
 *
 * ```tsx
 * // In your app root (optional — SchemaCrudPage still works without it):
 * <SchemaProvider>
 *   <App />
 * </SchemaProvider>
 * ```
 *
 * ## Fallback behaviour
 * If `useSchemaContext()` is called outside a `<SchemaProvider>`, it falls
 * back to calling `useHydraMetadata()` directly, keeping backward compat.
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import { useHydraMetadata, type UseHydraMetadataResult } from './useHydraMetadata';

/** Sentinel value used to detect "outside a provider" */
const OUTSIDE_PROVIDER = Symbol('OUTSIDE_PROVIDER');

type SchemaContextValue = UseHydraMetadataResult | typeof OUTSIDE_PROVIDER;

const SchemaContext = createContext<SchemaContextValue>(OUTSIDE_PROVIDER);

interface SchemaProviderProps {
  children: ReactNode;
}

/**
 * Wrap your app (or a subtree) with `SchemaProvider` to share a single
 * `/api/docs.jsonld` fetch across all `SchemaCrudPage` instances.
 */
export function SchemaProvider({ children }: SchemaProviderProps) {
  const metadata = useHydraMetadata();
  return <SchemaContext.Provider value={metadata}>{children}</SchemaContext.Provider>;
}

export interface UseSchemaContextResult {
  data: UseHydraMetadataResult['data'];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  refetch?: () => void;
}

/**
 * Returns the shared schema context if inside a `<SchemaProvider>`,
 * otherwise falls back to calling `useHydraMetadata()` directly.
 *
 * This makes `SchemaCrudPage` work standalone without requiring a provider.
 */
export function useSchemaContext(): UseSchemaContextResult {
  const ctx = useContext(SchemaContext);

  // Fallback path — called outside a SchemaProvider.
  // We always call useHydraMetadata() here unconditionally so React's
  // rules-of-hooks are satisfied (hooks must be called in the same order
  // on every render). When inside a provider, the result is unused.
  const fallback = useHydraMetadata();

  if (ctx === OUTSIDE_PROVIDER) {
    return {
      data: fallback.data,
      isLoading: fallback.isLoading,
      isError: fallback.error !== undefined,
      error: fallback.error,
    };
  }

  return {
    data: ctx.data,
    isLoading: ctx.isLoading,
    isError: ctx.error !== undefined,
    error: ctx.error,
  };
}
