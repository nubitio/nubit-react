import {
  DashboardPage,
  barChartWidget,
  configureCore,
  defineDashboard,
  donutChartWidget,
  statWidget,
  tableWidget,
  type DashboardDataResult,
} from '@nubitio/react-admin';

configureCore({ locale: 'en', currency: 'USD' });

const MOCK_DATA: Record<string, unknown> = {
  stats: {
    revenue: 12480,
    revenueTrend: 0.124,
    orders: 356,
    ordersTrend: 0.041,
    customers: 1209,
    customersTrend: 0.087,
    avgTicket: 35.05,
    avgTicketTrend: -0.012,
  },
  salesByDay: [
    { label: 'Mon', total: 820 },
    { label: 'Tue', total: 1240 },
    { label: 'Wed', total: 980 },
    { label: 'Thu', total: 1560 },
    { label: 'Fri', total: 2100 },
    { label: 'Sat', total: 2480 },
    { label: 'Sun', total: 1320 },
  ],
  byCategory: [
    { name: 'Food', total: 5200 },
    { name: 'Drinks', total: 3100 },
    { name: 'Desserts', total: 1800 },
    { name: 'Other', total: 2380 },
  ],
  recentOrders: [
    { number: 'ORD-1042', customer: 'Maria Lopez', status: 'paid', total: 48.5 },
    { number: 'ORD-1041', customer: 'John Smith', status: 'preparing', total: 72.0 },
    { number: 'ORD-1040', customer: 'Ana Ruiz', status: 'open', total: 31.25 },
    { number: 'ORD-1039', customer: 'Walk-in', status: 'cancelled', total: 0 },
    { number: 'ORD-1038', customer: 'Carlos Vega', status: 'paid', total: 96.8 },
  ],
};

function useMockDashboardData(): DashboardDataResult {
  return {
    data: MOCK_DATA,
    loading: false,
    error: null,
    refetch: () => undefined,
  };
}

const overview = defineDashboard({
  title: 'Dashboard',
  useData: useMockDashboardData,
  sections: [
    {
      id: 'kpis',
      layout: 'stats',
      widgets: [
        statWidget({
          id: 'revenue',
          title: 'Revenue',
          valuePath: 'stats.revenue',
          format: 'currency',
          icon: 'ph-currency-dollar',
          iconTone: 'accent',
          trend: { valuePath: 'stats.revenueTrend', label: 'vs last month' },
        }),
        statWidget({
          id: 'orders',
          title: 'Orders',
          valuePath: 'stats.orders',
          format: 'number',
          icon: 'ph-shopping-bag',
          iconTone: 'success',
          trend: { valuePath: 'stats.ordersTrend', label: 'vs last month' },
        }),
        statWidget({
          id: 'customers',
          title: 'Active customers',
          valuePath: 'stats.customers',
          format: 'number',
          icon: 'ph-users',
          iconTone: 'info',
          trend: { valuePath: 'stats.customersTrend', label: 'vs last month' },
        }),
        statWidget({
          id: 'avg-ticket',
          title: 'Avg. ticket',
          valuePath: 'stats.avgTicket',
          format: 'currency',
          icon: 'ph-receipt',
          iconTone: 'warning',
          trend: { valuePath: 'stats.avgTicketTrend', label: 'vs last month', invertColors: true },
        }),
      ],
    },
    {
      id: 'charts',
      layout: 'charts',
      widgets: [
        barChartWidget({
          id: 'sales-by-day',
          title: 'Revenue by day',
          subtitle: 'Last 7 days',
          dataPath: 'salesByDay',
          xKey: 'label',
          yKey: 'total',
        }),
        donutChartWidget({
          id: 'by-category',
          title: 'By category',
          subtitle: 'This month',
          dataPath: 'byCategory',
          labelKey: 'name',
          valueKey: 'total',
          centerLabel: 'Total',
          centerValuePath: 'stats.revenue',
        }),
      ],
    },
    {
      id: 'recent',
      layout: 'full',
      widgets: [
        tableWidget({
          id: 'recent-orders',
          title: 'Recent orders',
          subtitle: 'Latest activity',
          dataPath: 'recentOrders',
          viewAll: { to: '/users', label: 'View all' },
          columns: [
            { key: 'number', label: 'Order' },
            { key: 'customer', label: 'Customer' },
            {
              key: 'status',
              label: 'Status',
              badge: {
                paid: 'success',
                preparing: 'warning',
                open: 'info',
                cancelled: 'danger',
              },
            },
            { key: 'total', label: 'Total', format: 'currency', align: 'right' },
          ],
        }),
      ],
    },
  ],
});

export function DashboardDemoPage() {
  return <DashboardPage config={overview} />;
}