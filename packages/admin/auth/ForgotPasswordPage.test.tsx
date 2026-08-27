import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordPage } from './ForgotPasswordPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage apiBaseUrl="/api/" />
    </MemoryRouter>,
    { reactStrictMode: false },
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('posts the address to the forgot-password endpoint', async () => {
    renderPage();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/password/forgot',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({ username: 'user@example.com' });
  });

  it('never reveals whether the account exists', async () => {
    renderPage();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nobody@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    // The confirmation is deliberately non-committal. Saying "no such account"
    // here would turn this form into a way to enumerate who has one.
    const confirmation = await screen.findByText(/if that address has an account/i);
    expect(confirmation).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps submission disabled until an address is entered', () => {
    renderPage();

    const submit = screen.getByRole('button', { name: /send reset link/i });
    expect(submit.hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'user@example.com' } });
    expect(submit.hasAttribute('disabled')).toBe(false);
  });
});
