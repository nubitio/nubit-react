import type { DashboardConfig } from './types';

const dashboardCache = new Map<string, DashboardConfig>();

function cacheKey(config: DashboardConfig): string | null {
  try {
    return JSON.stringify({
      id: config.id,
      title: config.title,
      dataUrl: config.dataUrl,
      sections: config.sections,
    });
  } catch {
    return null;
  }
}

/**
 * Declarative dashboard definition — mirrors `defineResource` ergonomics.
 *
 * ```ts
 * const overview = defineDashboard({
 *   title: 'Dashboard',
 *   dataUrl: '/api/dashboard/overview',
 *   sections: [
 *     { layout: 'stats', widgets: [statWidget({ id: 'revenue', title: 'Revenue', valuePath: 'stats.revenue', format: 'currency' })] },
 *   ],
 * });
 *
 * export const DashboardRoute = () => <DashboardPage config={overview} />;
 * ```
 */
export function defineDashboard(config: DashboardConfig): DashboardConfig {
  const key = cacheKey(config);
  if (key !== null && dashboardCache.has(key)) {
    return dashboardCache.get(key)!;
  }

  const dashboard: DashboardConfig = {
    id: 'dashboard',
    ...config,
  };

  if (key !== null) {
    dashboardCache.set(key, dashboard);
  }

  return dashboard;
}