import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AcceptInvitationPage } from './AcceptInvitationPage';

function renderPage(token = 'invite-token') {
  return render(
    <MemoryRouter initialEntries={[`/invitations/${token}`]}>
      <Routes>
        <Route path="/invitations/:token" element={<AcceptInvitationPage apiBaseUrl="/api/" />} />
      </Routes>
    </MemoryRouter>,
    { reactStrictMode: false },
  );
}

function passwordInput(): HTMLInputElement {
  const input = document.querySelector('input[type="password"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('password input not rendered');

  return input;
}

/** Resolves the invitation lookup, then whatever the accept call should return. */
function stubFetch(lookup: unknown, accept?: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(lookup)
    .mockResolvedValue(accept ?? { ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    stubFetch({ ok: true, json: async () => ({ email: 'invited@example.com' }) });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('looks the invitation up by the token in the route and shows who it is for', async () => {
    renderPage();

    expect(await screen.findByText('invited@example.com')).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      '/api/invitations/invite-token',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('reports an invitation the server no longer accepts', async () => {
    stubFetch({ ok: false, json: async () => ({}) });
    renderPage('spent-token');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('no longer valid');
  });

  it('posts the chosen password to the accept endpoint', async () => {
    const fetchMock = stubFetch(
      { ok: true, json: async () => ({ email: 'invited@example.com' }) },
      { ok: true, json: async () => ({}) },
    );
    renderPage();
    await screen.findByText('invited@example.com');

    fireEvent.change(passwordInput(), { target: { value: 'a-long-password' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('/api/invitations/invite-token/accept');
    expect(JSON.parse(String(init?.body))).toEqual({ password: 'a-long-password' });
    expect(await screen.findByText(/account created/i)).toBeTruthy();
  });

  it('refuses a password shorter than the policy minimum', async () => {
    renderPage();
    await screen.findByText('invited@example.com');

    fireEvent.change(passwordInput(), { target: { value: 'short' } });

    expect(screen.getByRole('button', { name: /create account/i }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('surfaces the server message when acceptance is rejected', async () => {
    stubFetch(
      { ok: true, json: async () => ({ email: 'invited@example.com' }) },
      { ok: false, json: async () => ({ message: 'That invitation expired.' }) },
    );
    renderPage();
    await screen.findByText('invited@example.com');

    fireEvent.change(passwordInput(), { target: { value: 'a-long-password' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('That invitation expired.');
  });
});
