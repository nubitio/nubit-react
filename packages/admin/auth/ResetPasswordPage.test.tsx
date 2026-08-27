import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';

function renderPage(search = '?token=reset-token') {
  return render(
    <MemoryRouter initialEntries={[`/reset${search}`]}>
      <ResetPasswordPage apiBaseUrl="/api/" />
    </MemoryRouter>,
    { reactStrictMode: false },
  );
}

function passwordInput(): HTMLInputElement {
  const input = document.querySelector('input[type="password"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('password input not rendered');

  return input;
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('sends the token from the query string with the new password', async () => {
    renderPage();

    fireEvent.change(passwordInput(), { target: { value: 'a-long-password' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('/api/auth/password/reset');
    expect(JSON.parse(String(init?.body))).toEqual({
      token: 'reset-token',
      password: 'a-long-password',
    });
  });

  it('refuses to submit without a token, however good the password', () => {
    renderPage('');

    fireEvent.change(passwordInput(), { target: { value: 'a-long-password' } });

    expect(screen.getByRole('button', { name: /update password/i }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('refuses a password shorter than the policy minimum', () => {
    renderPage();

    fireEvent.change(passwordInput(), { target: { value: 'short' } });

    expect(screen.getByRole('button', { name: /update password/i }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('surfaces the server message when the token is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'This reset link has expired.' }),
      }),
    );
    renderPage();

    fireEvent.change(passwordInput(), { target: { value: 'a-long-password' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('This reset link has expired.');
  });

  it('reports a network failure instead of claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    renderPage();

    fireEvent.change(passwordInput(), { target: { value: 'a-long-password' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Network error');
  });
});
