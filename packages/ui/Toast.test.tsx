import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport } from './Toast';

afterEach(cleanup);

describe('ToastViewport', () => {
  it('exposes a live region and dismisses', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ToastViewport
        toasts={[{ id: '1', message: 'Saved', tone: 'success' }]}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Saved');
    expect(document.querySelector('[aria-live="polite"]')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalledWith('1');
  });
});
