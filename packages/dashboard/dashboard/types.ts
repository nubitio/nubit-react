import type { BadgeVariant } from '@nubitio/ui';

export type ValueFormat = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'datetime';

export interface TrendConfig {
  /** Dot-path into dashboard payload, e.g. `stats.revenueTrend`. */
  valuePath?: string;
  /** Static trend value when not using `valuePath`. */
  value?: number;
  /** Suffix label, e.g. "vs last month". */
  label?: string;
  /** When true, negative trend renders as success (e.g. churn, refunds). */
  invertColors?: boolean;
}

export type StatIconTone = 'accent' | 'success' | 'warning' | 'danger' | 'info';

/** Independent data source for a single widget — bypasses the dashboard's shared payload. */
export interface WidgetQueryConfig {
  /** GET endpoint, relative or absolute — resolved the same way as `DashboardConfig.dataUrl`. */
  url: string;
  params?: Record<string, string>;
  /** Include the dashboard's resolved period as query params and refetch when it changes. Defaults to true. */
  usePeriod?: boolean;
  refreshInterval?: number;
}

export interface BaseWidgetConfig {
  id: string;
  title: string;
  menuVisible?: boolean;
  /** Fetches this widget's data independently via react-query instead of reading the dashboard's shared payload. */
  query?: WidgetQueryConfig;
}

export interface StatWidgetConfig extends BaseWidgetConfig {
  type: 'stat';
  valuePath?: string;
  value?: string | number;
  format?: ValueFormat;
  icon?: string;
  iconTone?: StatIconTone;
  trend?: TrendConfig;
}

export interface BarChartWidgetConfig extends BaseWidgetConfig {
  type: 'bar-chart';
  subtitle?: string;
  dataPath: string;
  xKey: string;
  yKey: string;
  valueFormat?: ValueFormat;
  height?: number;
}

export interface DonutChartWidgetConfig extends BaseWidgetConfig {
  type: 'donut-chart';
  subtitle?: string;
  dataPath: string;
  labelKey: string;
  valueKey: string;
  colors?: string[];
  showLegend?: boolean;
  centerLabel?: string;
  centerValuePath?: string;
  valueFormat?: ValueFormat;
}

export interface TableColumnConfig {
  key: string;
  label: string;
  format?: ValueFormat;
  align?: 'left' | 'right' | 'center';
  badge?: Record<string, BadgeVariant>;
  badgeLabels?: Record<string, string>;
}

export interface TableViewAllConfig {
  to: string;
  label?: string;
}

export interface TableWidgetConfig extends BaseWidgetConfig {
  type: 'table';
  subtitle?: string;
  dataPath: string;
  columns: TableColumnConfig[];
  viewAll?: TableViewAllConfig;
  emptyTitle?: string;
  emptyDescription?: string;
}

export interface ChartSeriesConfig {
  /** Numeric field within each row of `dataPath`. */
  key: string;
  label?: string;
  color?: string;
  valueFormat?: ValueFormat;
}

export interface LineChartWidgetConfig extends BaseWidgetConfig {
  type: 'line-chart';
  subtitle?: string;
  dataPath: string;
  xKey: string;
  /** One entry renders a single line; multiple entries render a multi-series chart. */
  series: ChartSeriesConfig[];
  valueFormat?: ValueFormat;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  curved?: boolean;
}

export interface AreaChartWidgetConfig extends BaseWidgetConfig {
  type: 'area-chart';
  subtitle?: string;
  dataPath: string;
  xKey: string;
  series: ChartSeriesConfig[];
  stacked?: boolean;
  valueFormat?: ValueFormat;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

export interface ProgressWidgetConfig extends BaseWidgetConfig {
  type: 'progress';
  subtitle?: string;
  valuePath?: string;
  value?: number;
  maxPath?: string;
  /** Defaults to 100. */
  max?: number;
  format?: ValueFormat;
  tone?: StatIconTone;
}

/**
 * Escape hatch for widget types registered via `registerWidgetType` that aren't
 * one of the built-ins. `type` is intentionally a plain `string` so third-party
 * widget types type-check without editing this union.
 */
export interface CustomWidgetConfig extends BaseWidgetConfig {
  type: string;
  [key: string]: unknown;
}

export type DashboardWidget =
  | StatWidgetConfig
  | BarChartWidgetConfig
  | DonutChartWidgetConfig
  | LineChartWidgetConfig
  | AreaChartWidgetConfig
  | ProgressWidgetConfig
  | TableWidgetConfig
  | CustomWidgetConfig;

export type DashboardSectionLayout = 'stats' | 'charts' | 'full' | 'grid';

export interface DashboardSection {
  id?: string;
  layout?: DashboardSectionLayout;
  /** For `grid` layout — column count or CSS grid template. */
  columns?: number | string;
  widgets: DashboardWidget[];
}

export interface DashboardDataResult {
  data: Record<string, unknown>;
  loading?: boolean;
  error?: string | null;
  refetch?: () => void;
}

/** Resolved period selection, passed to `useData` and appended to `dataUrl`. */
export interface DashboardPeriodValue {
  presetKey: string;
  /** ISO date, e.g. `2026-06-01`. */
  start: string;
  /** ISO date, e.g. `2026-06-30`. */
  end: string;
}

export interface DashboardPeriodPreset {
  key: string;
  label: string;
  /** Computes the ISO date range for this preset, relative to `today`. */
  getRange: (today: Date) => { start: string; end: string };
}

export interface DashboardPeriodConfig {
  presets?: DashboardPeriodPreset[];
  defaultPreset?: string;
  /** Shows a "Custom" segment that opens a date-range picker. Defaults to true. */
  allowCustomRange?: boolean;
  /** Query param names appended to `dataUrl`. Defaults to `{ start: 'from', end: 'to' }`. */
  paramNames?: { start: string; end: string };
  /** URL search param used to persist the selection. Defaults to `period`. */
  urlParam?: string;
}

export interface DashboardConfig {
  id?: string;
  title: string;
  /** GET endpoint returning the dashboard JSON payload. */
  dataUrl?: string;
  /** Custom data hook — takes precedence over `dataUrl`. Receives the resolved period when `period` is configured. */
  useData?: (period?: DashboardPeriodValue) => DashboardDataResult;
  sections: DashboardSection[];
  refreshInterval?: number;
  /** Enables a period filter in the toolbar; omit to disable. */
  period?: DashboardPeriodConfig;
  /** Lets end users hide/reorder widgets within a section; persisted to localStorage per `id`. */
  customizable?: boolean;
}
