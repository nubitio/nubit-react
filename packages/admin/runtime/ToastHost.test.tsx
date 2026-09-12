import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastHost } from './ToastHost';

afterEach(cleanup);

describe('ToastHost', () => {
  it('renders through ToastViewport and dismisses by numeric id', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ToastHost
        toasts={[{ id: 42, message: 'Saved', type: 'success' }]}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Saved');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalledWith(42);
  });
});
