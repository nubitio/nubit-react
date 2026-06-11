/**
 * Drawer size tokens for CRUD viewMode.
 *
 * Tokens describe spatial capacity (how wide the panel is), not domain meaning.
 * `drawerWidth` always wins when set explicitly.
 */
export type CrudDrawerSize = 'sm' | 'md' | 'lg' | 'xl';

export const DRAWER_WIDTHS: Record<CrudDrawerSize, number> = {
  sm: 480,
  md: 640,
  lg: 880,
  xl: 1120,
};

export const DEFAULT_DRAWER_SIZE: CrudDrawerSize = 'lg';

export const DEFAULT_DRAWER_WIDTH = `min(${DRAWER_WIDTHS.lg}px, 60vw)`;

export function resolveDrawerWidth(options?: {
  drawerSize?: CrudDrawerSize;
  drawerWidth?: number | string;
}): number | string {
  if (options?.drawerWidth != null) return options.drawerWidth;
  if (options?.drawerSize != null) return DRAWER_WIDTHS[options.drawerSize];
  return DEFAULT_DRAWER_WIDTH;
}

export function parseDrawerWidthPx(drawerWidth?: number | string): number | undefined {
  if (drawerWidth == null) return undefined;
  if (typeof drawerWidth === 'number') return drawerWidth;

  const trimmed = drawerWidth.trim();
  const minMatch = trimmed.match(/^min\(\s*(\d+(?:\.\d+)?)px/i);
  if (minMatch) return Number(minMatch[1]);

  const pxMatch = trimmed.match(/^(\d+(?:\.\d+)?)px$/i);
  if (pxMatch) return Number(pxMatch[1]);

  const vwMatch = trimmed.match(/^(\d+(?:\.\d+)?)vw$/i);
  if (vwMatch && typeof window !== 'undefined') {
    return (Number(vwMatch[1]) / 100) * window.innerWidth;
  }

  return undefined;
}

/**
 * Maps an effective drawer width to a layout bucket used by the form grid resolver.
 * Thresholds align with {@link DRAWER_WIDTHS} token boundaries.
 */
export function resolveDrawerLayoutBucket(drawerWidth?: number | string): CrudDrawerSize {
  const px = parseDrawerWidthPx(drawerWidth);
  if (px == null) return 'md';
  if (px < DRAWER_WIDTHS.md) return 'sm';
  if (px < DRAWER_WIDTHS.lg) return 'md';
  if (px < DRAWER_WIDTHS.xl) return 'lg';
  return 'xl';
}