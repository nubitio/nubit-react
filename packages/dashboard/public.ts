/**
 * @nubitio/dashboard — declarative dashboard engine.
 *
 * Requires a `@tanstack/react-query` `QueryClientProvider` ancestor (already
 * provided by `createNubitApp` from `@nubitio/admin`) — data fetching, both
 * the dashboard's shared payload and any per-widget `query`, goes through it.
 *
 * Quick start:
 *   const overview = defineDashboard({
 *     title: 'Dashboard',
 *     dataUrl: '/api/dashboard/overview',
 *     sections: [
 *       {
 *         layout: 'stats',
 *         widgets: [
 *           statWidget({ id: 'revenue', title: 'Revenue', valuePath: 'stats.revenue', format: 'currency', icon: 'ph-currency-dollar' }),
 *         ],
 *       },
 *     ],
 *   });
 *
 *   export const HomePage = () => <DashboardPage config={overview} />;
 *
 * Custom widget types can be registered without forking the package:
 *   registerWidgetType('funnel', FunnelWidgetView);
 */

export {
  defineDashboard,
  DashboardPage,
  DashboardPeriodFilter,
  DashboardLayoutControls,
  DashboardWidgetSlot,
  useDashboardData,
  useWidgetQuery,
  useDashboardPeriod,
  useDashboardLayout,
  CUSTOM_PERIOD_KEY,
  DEFAULT_PERIOD_PRESETS,
  DEFAULT_PERIOD_PARAM_NAMES,
  DEFAULT_CHART_COLORS,
  getPeriodPreset,
  registerWidgetType,
  getWidgetComponent,
  isWidgetTypeRegistered,
  statWidget,
  barChartWidget,
  donutChartWidget,
  tableWidget,
  lineChartWidget,
  areaChartWidget,
  progressWidget,
  resolvePath,
  resolveArray,
  formatDashboardValue,
} from './dashboard';
export type {
  AreaChartWidgetConfig,
  BarChartWidgetConfig,
  BaseWidgetConfig,
  ChartSeriesConfig,
  CustomWidgetConfig,
  DashboardConfig,
  DashboardDataResult,
  DashboardPageProps,
  DashboardLayoutState,
  DashboardPeriodConfig,
  DashboardPeriodPreset,
  DashboardPeriodState,
  DashboardPeriodValue,
  DashboardSection,
  DashboardSectionLayout,
  DashboardWidget,
  DonutChartWidgetConfig,
  HiddenWidgetEntry,
  LineChartWidgetConfig,
  ProgressWidgetConfig,
  StatIconTone,
  StatWidgetConfig,
  TableColumnConfig,
  TableViewAllConfig,
  TableWidgetConfig,
  TrendConfig,
  ValueFormat,
  WidgetComponent,
  WidgetQueryConfig,
  WidgetQueryResult,
  WidgetViewProps,
} from './dashboard';
