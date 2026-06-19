import type { DashboardWidget } from '../types';
import { BarChartWidgetView } from './BarChartWidgetView';
import { DonutChartWidgetView } from './DonutChartWidgetView';
import { StatWidgetView } from './StatWidgetView';
import { TableWidgetView } from './TableWidgetView';

type Props = {
  widget: DashboardWidget;
  data: Record<string, unknown>;
  loading?: boolean;
};

export function WidgetRenderer({ widget, data, loading }: Props) {
  switch (widget.type) {
    case 'stat':
      return <StatWidgetView widget={widget} data={data} loading={loading} />;
    case 'bar-chart':
      return <BarChartWidgetView widget={widget} data={data} loading={loading} />;
    case 'donut-chart':
      return <DonutChartWidgetView widget={widget} data={data} loading={loading} />;
    case 'table':
      return <TableWidgetView widget={widget} data={data} loading={loading} />;
    default:
      return null;
  }
}