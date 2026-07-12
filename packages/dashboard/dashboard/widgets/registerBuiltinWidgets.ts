import { registerWidgetType } from '../widgetRegistry';
import { AreaChartWidgetView } from './AreaChartWidgetView';
import { BarChartWidgetView } from './BarChartWidgetView';
import { DonutChartWidgetView } from './DonutChartWidgetView';
import { LineChartWidgetView } from './LineChartWidgetView';
import { ProgressWidgetView } from './ProgressWidgetView';
import { StatWidgetView } from './StatWidgetView';
import { TableWidgetView } from './TableWidgetView';

registerWidgetType('stat', StatWidgetView);
registerWidgetType('bar-chart', BarChartWidgetView);
registerWidgetType('donut-chart', DonutChartWidgetView);
registerWidgetType('line-chart', LineChartWidgetView);
registerWidgetType('area-chart', AreaChartWidgetView);
registerWidgetType('progress', ProgressWidgetView);
registerWidgetType('table', TableWidgetView);
