import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, FormField, TextField } from '@nubitio/ui';

export interface ResetPasswordPageProps {
  apiBaseUrl?: string;
}

function joinApiPath(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function ResetPasswordPage({ apiBaseUrl = '/api/' }: ResetPasswordPageProps) {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(joinApiPath(apiBaseUrl, 'auth/password/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? 'Reset failed');
        return;
      }
      setDone(true);
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
          <h2 style={{ margin: 0 }}>Choose a new password</h2>
          {done ? (
            <p style={{ margin: 0 }}>
              Password updated.{' '}
              <Link to="/" style={{ fontSize: '0.875rem' }}>
                Sign in
              </Link>
            </p>
          ) : (
            <>
              <FormField label="New password">
                <TextField
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              {error && (
                <p style={{ margin: 0, color: 'var(--error-color, #dc2626)' }} role="alert">
                  {error}
                </p>
              )}
              <Button
                variant="primary"
                type="submit"
                disabled={busy || token === '' || password.length < 8}
              >
                {busy ? 'Saving…' : 'Update password'}
              </Button>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}
