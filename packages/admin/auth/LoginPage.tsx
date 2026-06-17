import { useState, type FormEvent } from 'react';
import { Button, Card, TextField } from '@nubitio/ui';

export interface LoginPageProps {
  onLoggedIn: () => void;
  apiBaseUrl?: string;
  loginPath?: string;
  title?: string;
  hint?: string;
  defaultUsername?: string;
}

function joinApiPath(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function LoginPage({
  onLoggedIn,
  apiBaseUrl = '/api/',
  loginPath = 'auth/login',
  title = 'Nubit Admin',
  hint,
  defaultUsername = '',
}: LoginPageProps) {
  const [username, setUsername] = useState(defaultUsername);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(joinApiPath(apiBaseUrl, loginPath), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'Login failed');
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
          {hint && (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{hint}</p>
          )}
          <TextField
            placeholder="Email"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            placeholder="Password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p style={{ margin: 0, color: 'var(--error-color, #dc2626)' }}>{error}</p>}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}