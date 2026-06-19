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

export interface StatWidgetConfig {
  type: 'stat';
  id: string;
  title: string;
  valuePath?: string;
  value?: string | number;
  format?: ValueFormat;
  icon?: string;
  iconTone?: StatIconTone;
  trend?: TrendConfig;
  menuVisible?: boolean;
}

export interface BarChartWidgetConfig {
  type: 'bar-chart';
  id: string;
  title: string;
  subtitle?: string;
  dataPath: string;
  xKey: string;
  yKey: string;
  valueFormat?: ValueFormat;
  height?: number;
  menuVisible?: boolean;
}

export interface DonutChartWidgetConfig {
  type: 'donut-chart';
  id: string;
  title: string;
  subtitle?: string;
  dataPath: string;
  labelKey: string;
  valueKey: string;
  colors?: string[];
  showLegend?: boolean;
  centerLabel?: string;
  centerValuePath?: string;
  valueFormat?: ValueFormat;
  menuVisible?: boolean;
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

export interface TableWidgetConfig {
  type: 'table';
  id: string;
  title: string;
  subtitle?: string;
  dataPath: string;
  columns: TableColumnConfig[];
  viewAll?: TableViewAllConfig;
  emptyTitle?: string;
  emptyDescription?: string;
  menuVisible?: boolean;
}

export type DashboardWidget =
  | StatWidgetConfig
  | BarChartWidgetConfig
  | DonutChartWidgetConfig
  | TableWidgetConfig;

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

export interface DashboardConfig {
  id?: string;
  title: string;
  /** GET endpoint returning the dashboard JSON payload. */
  dataUrl?: string;
  /** Custom data hook — takes precedence over `dataUrl`. */
  useData?: () => DashboardDataResult;
  sections: DashboardSection[];
  refreshInterval?: number;
}