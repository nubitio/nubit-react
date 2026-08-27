import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, FormField, TextField } from '@nubitio/ui';

export interface LoginOidcProvider {
  id: string;
  label: string;
}

export interface LoginPageProps {
  onLoggedIn: () => void;
  apiBaseUrl?: string;
  loginPath?: string;
  title?: string;
  hint?: string;
  defaultUsername?: string;
  oidcProviders?: LoginOidcProvider[];
  forgotPasswordTo?: string;
}

function joinApiPath(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

const TOTP_REQUIRED = 'second factor required.';

export function LoginPage({
  onLoggedIn,
  apiBaseUrl = '/api/',
  loginPath = 'auth/login',
  title = 'Nubit Admin',
  hint,
  defaultUsername = '',
  oidcProviders = [],
  forgotPasswordTo = '/forgot-password',
}: LoginPageProps) {
  const [username, setUsername] = useState(defaultUsername);
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string> = { username, password };
      if (totpCode !== '') {
        body.totpCode = totpCode;
      }

      const response = await fetch(joinApiPath(apiBaseUrl, loginPath), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = payload?.message ?? 'Login failed';
        if (message.toLowerCase() === TOTP_REQUIRED) {
          setNeedsTotp(true);
          setError('Enter the code from your authenticator app.');
          return;
        }
        setError(message);
        return;
      }
      onLoggedIn();
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <Card>
        <form
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320, padding: 8 }}
        >
          <h2 style={{ margin: 0 }}>{title}</h2>
          {hint && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{hint}</p>}
          <FormField label="Email">
            <TextField
              placeholder="Email"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </FormField>
          <FormField label="Password">
            <TextField
              placeholder="Password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          {needsTotp && (
            <FormField label="Authenticator code">
              <TextField
                placeholder="123456"
                value={totpCode}
                autoComplete="one-time-code"
                inputMode="numeric"
                onChange={(e) => setTotpCode(e.target.value)}
              />
            </FormField>
          )}
          {error && (
            <p style={{ margin: 0, color: 'var(--error-color, #dc2626)' }} role="alert">
              {error}
            </p>
          )}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <Link to={forgotPasswordTo} style={{ fontSize: '0.875rem' }}>
            Forgot password?
          </Link>
          {oidcProviders.map((provider) => (
            <Button
              key={provider.id}
              variant="secondary"
              type="button"
              onClick={() => {
                window.location.assign(joinApiPath(apiBaseUrl, `auth/oidc/${provider.id}/redirect`));
              }}
            >
              {provider.label}
            </Button>
          ))}
        </form>
      </Card>
    </div>
  );
}
