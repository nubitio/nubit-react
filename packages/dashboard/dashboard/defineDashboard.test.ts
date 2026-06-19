import { describe, expect, it } from 'vitest';
import { defineDashboard } from './defineDashboard';
import { statWidget } from './widgetBuilders';

describe('defineDashboard', () => {
  it('returns a config with default id', () => {
    const config = defineDashboard({
      title: 'Overview',
      sections: [{ widgets: [statWidget({ id: 'a', title: 'A', value: 1 })] }],
    });
    expect(config.id).toBe('dashboard');
    expect(config.title).toBe('Overview');
    expect(config.sections[0].widgets[0].type).toBe('stat');
  });

  it('caches identical definitions', () => {
    const input = {
      title: 'Overview',
      sections: [{ widgets: [statWidget({ id: 'a', title: 'A', value: 1 })] }],
    };
    expect(defineDashboard(input)).toBe(defineDashboard(input));
  });
});