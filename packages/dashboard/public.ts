/**
 * @nubitio/dashboard — declarative dashboard engine.
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
 */

export {
  defineDashboard,
  DashboardPage,
  useDashboardData,
  statWidget,
  barChartWidget,
  donutChartWidget,
  tableWidget,
  resolvePath,
  resolveArray,
  formatDashboardValue,
} from './dashboard';
export type {
  BarChartWidgetConfig,
  DashboardConfig,
  DashboardDataResult,
  DashboardPageProps,
  DashboardSection,
  DashboardSectionLayout,
  DashboardWidget,
  DonutChartWidgetConfig,
  StatIconTone,
  StatWidgetConfig,
  TableColumnConfig,
  TableViewAllConfig,
  TableWidgetConfig,
  TrendConfig,
  ValueFormat,
} from './dashboard';