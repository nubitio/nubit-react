import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';
import { Button } from './Button';

afterEach(cleanup);

describe('Tooltip', () => {
  it('opens on hover, describes the trigger and closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Download the report" delay={0}>
        <button type="button">Export</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Export' });
    await user.hover(trigger);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toBe('Download the report');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('does not open when disabled', async () => {
    render(
      <Tooltip content="Download the report" disabled>
        <button type="button">Export</button>
      </Tooltip>,
    );
    await userEvent.setup().tab();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('composes with Nubit Button and preserves an existing description and ref', async () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <>
        <span id="export-description">CSV format</span>
        <Tooltip content="Download" delay={0}>
          <Button ref={ref} aria-describedby="export-description">
            Export
          </Button>
        </Tooltip>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Export' });
    await userEvent.setup().hover(trigger);
    const popup = await screen.findByRole('tooltip');
    expect(ref.current).toBe(trigger);
    expect(trigger.getAttribute('aria-describedby')).toBe(`export-description ${popup.id}`);
  });
});
