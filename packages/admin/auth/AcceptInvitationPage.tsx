import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, FormField, TextField } from '@nubitio/ui';

export interface AcceptInvitationPageProps {
  apiBaseUrl?: string;
}

function joinApiPath(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function AcceptInvitationPage({ apiBaseUrl = '/api/' }: AcceptInvitationPageProps) {
  const { token = '' } = useParams();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(joinApiPath(apiBaseUrl, `invitations/${token}`), { credentials: 'include' })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setError('This invitation is no longer valid.');
          return;
        }
        const payload = (await response.json()) as { email?: string };
        setEmail(payload.email ?? null);
      })
      .catch(() => {
        if (!cancelled) setError('Network error');
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, token]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(joinApiPath(apiBaseUrl, `invitations/${token}/accept`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? 'Could not accept the invitation');
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
          <h2 style={{ margin: 0 }}>Join</h2>
          {done ? (
            <p style={{ margin: 0 }}>
              Account created.{' '}
              <Link to="/" style={{ fontSize: '0.875rem' }}>
                Sign in
              </Link>
            </p>
          ) : (
            <>
              {email && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{email}</p>}
              <FormField label="Password">
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
              <Button variant="primary" type="submit" disabled={busy || password.length < 8}>
                {busy ? 'Creating…' : 'Create account'}
              </Button>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}
