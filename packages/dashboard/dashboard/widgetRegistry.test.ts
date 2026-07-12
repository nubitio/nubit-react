import { describe, expect, it } from 'vitest';
import { getWidgetComponent, isWidgetTypeRegistered, registerWidgetType, type WidgetComponent } from './widgetRegistry';
import './widgets/registerBuiltinWidgets';

const Dummy: WidgetComponent = () => null;

describe('widgetRegistry', () => {
  it('registers built-in widget types on import', () => {
    for (const type of ['stat', 'bar-chart', 'donut-chart', 'line-chart', 'area-chart', 'progress', 'table']) {
      expect(isWidgetTypeRegistered(type)).toBe(true);
    }
  });

  it('returns undefined for unregistered types', () => {
    expect(getWidgetComponent('unknown-widget-type')).toBeUndefined();
    expect(isWidgetTypeRegistered('unknown-widget-type')).toBe(false);
  });

  it('lets consumers register a custom widget type', () => {
    registerWidgetType('custom-funnel', Dummy);
    expect(getWidgetComponent('custom-funnel')).toBe(Dummy);
  });

  it('lets a later registration override an earlier one, including built-ins', () => {
    const original = getWidgetComponent('stat');
    registerWidgetType('stat', Dummy);
    expect(getWidgetComponent('stat')).toBe(Dummy);
    // restore, so other tests importing the registry see the real StatWidgetView
    registerWidgetType('stat', original!);
  });
});
