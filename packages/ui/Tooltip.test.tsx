import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';

afterEach(cleanup);

describe('Tooltip', () => {
  it('shows content on hover and wires aria-describedby', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="More info" delay={0}>
        <button type="button">Hint</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Hint' }));
    expect((await screen.findByRole('tooltip')).textContent).toBe('More info');
    expect(
      screen.getByRole('button', { name: 'Hint' }).getAttribute('aria-describedby'),
    ).toBeTruthy();
  });

  it('hides on Escape', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="More info" delay={0}>
        <button type="button">Hint</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Hint' }));
    expect(await screen.findByRole('tooltip')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
