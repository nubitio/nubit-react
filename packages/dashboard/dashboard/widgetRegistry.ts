import type { ComponentType } from 'react';
import type { DashboardWidget } from './types';

export interface WidgetViewProps<W extends DashboardWidget = DashboardWidget> {
  widget: W;
  data: Record<string, unknown>;
  loading?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WidgetComponent = ComponentType<WidgetViewProps<any>>;

const registry = new Map<string, WidgetComponent>();

/**
 * Registers a component to render for `widget.type`. Built-in types (`stat`,
 * `bar-chart`, `donut-chart`, `line-chart`, `area-chart`, `progress`, `table`)
 * are registered automatically. Call this to add a new widget type — or to
 * replace a built-in one — without forking `@nubitio/dashboard`.
 *
 * ```ts
 * registerWidgetType('funnel', FunnelWidgetView);
 * ```
 */
export function registerWidgetType(type: string, component: WidgetComponent): void {
  registry.set(type, component);
}

export function getWidgetComponent(type: string): WidgetComponent | undefined {
  return registry.get(type);
}

export function isWidgetTypeRegistered(type: string): boolean {
  return registry.has(type);
}
