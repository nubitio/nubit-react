import type { CrudViewMode, CrudViewModeConfig } from '../crud/ResourceConfig';
import {
  DEFAULT_DRAWER_WIDTH,
  resolveDrawerWidth,
  type CrudDrawerSize,
} from './drawerSizes';

export type { CrudDrawerSize };

export interface ResolvedViewMode {
  mode: CrudViewMode;
  drawerWidth: number | string;
  drawerSide: 'right' | 'left';
  /** Set when the resource used a size token instead of an explicit width. */
  drawerSize?: CrudDrawerSize;
}

const DEFAULTS: ResolvedViewMode = {
  mode: 'dialog',
  drawerWidth: DEFAULT_DRAWER_WIDTH,
  drawerSide: 'right',
};

/**
 * Normalises the `viewMode` field of `ResourceConfig` into a fully-resolved
 * object with defaults applied. Accepts the shorthand string form
 * (`'dialog' | 'drawer' | 'page'`) or the full config object.
 */
export function resolveViewMode(
  raw: CrudViewMode | CrudViewModeConfig | undefined,
): ResolvedViewMode {
  if (raw == null) return DEFAULTS;
  if (typeof raw === 'string') {
    return { ...DEFAULTS, mode: raw };
  }
  const resolved: ResolvedViewMode = {
    mode: raw.mode,
    drawerWidth: resolveDrawerWidth({
      drawerSize: raw.drawerSize,
      drawerWidth: raw.drawerWidth,
    }),
    drawerSide: raw.drawerSide ?? DEFAULTS.drawerSide,
  };
  if (raw.drawerSize) {
    resolved.drawerSize = raw.drawerSize;
  }
  return resolved;
}
