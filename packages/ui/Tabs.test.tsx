import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Tab, TabList, TabPanel, Tabs } from './Tabs';

afterEach(cleanup);

function Harness() {
  const [value, setValue] = useState('one');
  return (
    <Tabs value={value} onChange={setValue}>
      <TabList ariaLabel="Sections">
        <Tab value="one">One</Tab>
        <Tab value="two">Two</Tab>
      </TabList>
      <TabPanel value="one">First panel</TabPanel>
      <TabPanel value="two">Second panel</TabPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('shows the selected panel and moves with arrow keys', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('tabpanel').textContent).toBe('First panel');
    await user.click(screen.getByRole('tab', { name: 'Two' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('Second panel');
    screen.getByRole('tab', { name: 'Two' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tabpanel').textContent).toBe('First panel');
  });
});
