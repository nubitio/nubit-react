import type {
  BarChartWidgetConfig,
  DonutChartWidgetConfig,
  StatWidgetConfig,
  TableWidgetConfig,
} from './types';

export function statWidget(config: Omit<StatWidgetConfig, 'type'>): StatWidgetConfig {
  return { type: 'stat', menuVisible: false, ...config };
}

export function barChartWidget(config: Omit<BarChartWidgetConfig, 'type'>): BarChartWidgetConfig {
  return { type: 'bar-chart', menuVisible: false, valueFormat: 'currency', height: 200, ...config };
}

export function donutChartWidget(config: Omit<DonutChartWidgetConfig, 'type'>): DonutChartWidgetConfig {
  return {
    type: 'donut-chart',
    menuVisible: false,
    showLegend: true,
    valueFormat: 'currency',
    ...config,
  };
}

export function tableWidget(config: Omit<TableWidgetConfig, 'type'>): TableWidgetConfig {
  return { type: 'table', menuVisible: false, ...config };
}