/**
 * MercureProvider — React context provider for the Mercure hub URL.
 *
 * Wraps the application (or a subtree) and makes the hub URL available to all
 * descendant hooks via `useMercureHub()`.
 *
 * Also keeps `MercureManager` in sync with the hub URL whenever it changes.
 *
 * ## Usage
 *
 * ```tsx
 * // In your app root:
 * <MercureProvider hubUrl={discoveredHubUrl}>
 *   <App />
 * </MercureProvider>
 * ```
 *
 * The `hubUrl` is typically discovered from the `Link` header of API responses
 * (common pattern with API Platform + Mercure).
 */

import React, { createContext, useEffect, type ReactNode } from 'react';
import mercureManager from './MercureManager';

/** The hub URL, or null if Mercure is not configured / not yet discovered. */
export const MercureContext = createContext<string | null>(null);

export interface MercureProviderProps {
  /** Hub URL discovered from the `Link` header, or null if unavailable. */
  hubUrl: string | null;
  children: ReactNode;
}

/**
 * Provides the Mercure hub URL to the React tree and keeps `MercureManager`
 * in sync whenever the URL changes.
 */
export function MercureProvider({ hubUrl, children }: MercureProviderProps) {
  useEffect(() => {
    mercureManager.setHubUrl(hubUrl);
  }, [hubUrl]);

  return <MercureContext.Provider value={hubUrl}>{children}</MercureContext.Provider>;
}
