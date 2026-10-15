import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Tabs } from './Tabs';
import type { TabsProps } from './Tabs';

afterEach(cleanup);

const items = [
  { value: 'general', label: 'General', content: <input aria-label="Name" defaultValue="Ada" /> },
  { value: 'locked', label: 'Locked', content: 'Unavailable', disabled: true },
  { value: 'activity', label: 'Activity', content: 'Recent events' },
];

function Example(props: Partial<TabsProps>) {
  const [value, setValue] = useState('general');
  return <Tabs items={items} value={value} onChange={setValue} aria-label="Account" {...props} />;
}

describe('Tabs', () => {
  it('links the selected tab and its panel', () => {
    render(<Example />);
    const tab = screen.getByRole('tab', { name: 'General' });
    const panel = screen.getByRole('tabpanel');
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(tab.tabIndex).toBe(0);
  });

  it('skips disabled tabs, wraps and supports Home and End', async () => {
    const user = userEvent.setup();
    render(<Example />);
    screen.getByRole('tab', { name: 'General' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Activity' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Activity' }));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'General' }));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Activity' }));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'General' }));
  });

  it('supports vertical navigation with manual activation', async () => {
    const user = userEvent.setup();
    render(<Example orientation="vertical" activationMode="manual" />);
    screen.getByRole('tab', { name: 'General' }).focus();
    await user.keyboard('{ArrowDown}');
    const activity = screen.getByRole('tab', { name: 'Activity' });
    expect(document.activeElement).toBe(activity);
    expect(activity.tabIndex).toBe(0);
    expect(activity.getAttribute('aria-selected')).toBe('false');
    await user.keyboard('{Enter}');
    expect(activity.getAttribute('aria-selected')).toBe('true');
  });

  it('preserves inactive form state when keepMounted is enabled', async () => {
    const user = userEvent.setup();
    render(<Example keepMounted />);
    await user.type(screen.getByRole('textbox'), ' Lovelace');
    await user.click(screen.getByRole('tab', { name: 'Activity' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'General' }));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Ada Lovelace');
  });
});
