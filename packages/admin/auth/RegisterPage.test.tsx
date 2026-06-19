import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage, type RegisterField } from './RegisterPage';

const fields: RegisterField[] = [
  { name: 'companyName', placeholder: 'Company' },
  { name: 'email', type: 'email', placeholder: 'Email' },
  { name: 'password', type: 'password', placeholder: 'Password' },
  {
    name: 'plan',
    type: 'select',
    defaultValue: 'trial',
    options: [
      { value: 'trial', label: 'Trial' },
      { value: 'pro', label: 'Pro' },
    ],
  },
];

function renderPage(onRegistered = vi.fn()) {
  return render(
    <MemoryRouter>
      <RegisterPage
        fields={fields}
        title="Sign up"
        onRegistered={onRegistered}
        apiBaseUrl="/api/"
        registerPath="auth/register"
      />
    </MemoryRouter>,
    { reactStrictMode: false },
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'ok' }),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders configurable fields', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Company')).toBeTruthy();
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByLabelText('plan')).toBeTruthy();
  });

  it('posts field values to the register endpoint', async () => {
    const onRegistered = vi.fn();
    renderPage(onRegistered);

    fireEvent.change(screen.getByPlaceholderText('Company'), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onRegistered).toHaveBeenCalledOnce());

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          companyName: 'Acme',
          email: 'a@b.com',
          password: 'secret123',
          plan: 'trial',
        }),
      }),
    );
  });

  it('shows server error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Email taken' }),
      }),
    );

    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]!);

    await waitFor(() => expect(screen.getByText('Email taken')).toBeTruthy());
  });
});