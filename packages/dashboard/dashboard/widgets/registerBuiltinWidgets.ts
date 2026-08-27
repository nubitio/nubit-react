import { lazy } from 'react';

import { registerWidgetType } from '../widgetRegistry';
import { BarChartWidgetView } from './BarChartWidgetView';
import { DonutChartWidgetView } from './DonutChartWidgetView';
import { ProgressWidgetView } from './ProgressWidgetView';
import { StatWidgetView } from './StatWidgetView';
import { TableWidgetView } from './TableWidgetView';

registerWidgetType('stat', StatWidgetView);
registerWidgetType('bar-chart', BarChartWidgetView);
registerWidgetType('donut-chart', DonutChartWidgetView);
// Estos dos son los únicos que usan recharts. Registrarlos de forma diferida
// mantiene la dependencia fuera del entry: una app que no use gráficos de
// línea o área —  o que dibuje los suyos con otra librería —  no necesita
// instalar recharts para compilar.
registerWidgetType(
  'line-chart',
  lazy(() => import('./LineChartWidgetView').then((m) => ({ default: m.LineChartWidgetView }))),
);
registerWidgetType(
  'area-chart',
  lazy(() => import('./AreaChartWidgetView').then((m) => ({ default: m.AreaChartWidgetView }))),
);
registerWidgetType('progress', ProgressWidgetView);
registerWidgetType('table', TableWidgetView);
