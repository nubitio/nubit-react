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
 * // Autodiscovery (recommended): hub URL comes from API `Link` headers.
 * <MercureProvider>
 *   <App />
 * </MercureProvider>
 *
 * // Manual override (e.g. before the first API response):
 * <MercureProvider hubUrl="/.well-known/mercure">
 *   <App />
 * </MercureProvider>
 * ```
 *
 * The hub URL is autodiscovered from the `Link` header of API responses
 * (API Platform + Mercure). Pass `hubUrl` only when you need an explicit override.
 */

import React, { createContext, useEffect, useState, type ReactNode } from 'react';
import mercureManager from './MercureManager';

/** The hub URL, or null if Mercure is not configured / not yet discovered. */
export const MercureContext = createContext<string | null>(null);

export interface MercureProviderProps {
  /**
   * Hub URL override. When omitted, the provider listens to autodiscovery
   * from API `Link` headers via `MercureManager`.
   */
  hubUrl?: string | null;
  children: ReactNode;
}

/**
 * Provides the Mercure hub URL to the React tree and keeps `MercureManager`
 * in sync whenever the URL changes.
 */
export function MercureProvider({ hubUrl: hubUrlOverride, children }: MercureProviderProps) {
  const [discoveredHubUrl, setDiscoveredHubUrl] = useState<string | null>(
    () => mercureManager.getHubUrl(),
  );

  useEffect(() => {
    if (hubUrlOverride !== undefined) {
      mercureManager.setHubUrl(hubUrlOverride);
      return;
    }

    setDiscoveredHubUrl(mercureManager.getHubUrl());
    return mercureManager.onHubUrlChange(setDiscoveredHubUrl);
  }, [hubUrlOverride]);

  const hubUrl = hubUrlOverride !== undefined ? hubUrlOverride : discoveredHubUrl;

  return <MercureContext.Provider value={hubUrl}>{children}</MercureContext.Provider>;
}