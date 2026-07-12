import './registerBuiltinWidgets';
import { getWidgetComponent } from '../widgetRegistry';
import type { DashboardWidget } from '../types';

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

type Props = {
  widget: DashboardWidget;
  data: Record<string, unknown>;
  loading?: boolean;
};

export function WidgetRenderer({ widget, data, loading }: Props) {
  const Component = getWidgetComponent(widget.type);

  if (!Component) {
    if (isDev) {
      console.warn(`[@nubitio/dashboard] No widget registered for type "${widget.type}".`);
    }
    return null;
  }

  // `Component` is a stable reference resolved from the module-level widget
  // registry (a Map), not created fresh per render — safe despite looking
  // like the "component created during render" anti-pattern to the linter.
  // eslint-disable-next-line react-hooks/static-components
  return <Component widget={widget} data={data} loading={loading} />;
}
