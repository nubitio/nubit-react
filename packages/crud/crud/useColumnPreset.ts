import { useState, useCallback } from 'react';
import type { ResourceConfig } from './ResourceConfig';

export interface ColumnPresetState {
  activePreset: string | null;
  setPreset: (key: string | null) => void;
  visibleColumns: string[] | null; // null = no restriction
}

function readFromStorage(resourceId: string): string | null {
  try {
    return localStorage.getItem(`column-preset:${resourceId}`);
  } catch {
    return null;
  }
}

function writeToStorage(resourceId: string, key: string | null): void {
  try {
    if (key === null) {
      localStorage.removeItem(`column-preset:${resourceId}`);
    } else {
      localStorage.setItem(`column-preset:${resourceId}`, key);
    }
  } catch {
    // localStorage may be unavailable in some environments; fail silently
  }
}

function resolveVisibleColumns(
  resource: ResourceConfig,
  activeKey: string | null,
): string[] | null {
  if (activeKey === null || !resource.columnPresets?.length) return null;
  const preset = resource.columnPresets.find((p) => p.key === activeKey);
  return preset?.columns ?? null;
}

export function useColumnPreset(resource: ResourceConfig): ColumnPresetState {
  const [activePreset, setActivePresetState] = useState<string | null>(() => {
    if (!resource.columnPresets?.length) return null;
    const stored = readFromStorage(resource.id);
    if (stored && resource.columnPresets.some((p) => p.key === stored)) {
      return stored;
    }
    return resource.defaultPreset ?? null;
  });

  const setPreset = useCallback(
    (key: string | null) => {
      writeToStorage(resource.id, key);
      setActivePresetState(key);
    },
    [resource.id],
  );

  const visibleColumns = resolveVisibleColumns(resource, activePreset);

  return { activePreset, setPreset, visibleColumns };
}
