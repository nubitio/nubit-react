import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, FormField, TextField } from '@nubitio/ui';

export interface ForgotPasswordPageProps {
  apiBaseUrl?: string;
}

function joinApiPath(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function ForgotPasswordPage({ apiBaseUrl = '/api/' }: ForgotPasswordPageProps) {
  const [username, setUsername] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await fetch(joinApiPath(apiBaseUrl, 'auth/password/forgot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      });
      setSent(true);
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
          <h2 style={{ margin: 0 }}>Reset password</h2>
          {sent ? (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              If that address has an account, a reset link is on its way.
            </p>
          ) : (
            <>
              <FormField label="Email">
                <TextField
                  value={username}
                  autoComplete="username"
                  onChange={(e) => setUsername(e.target.value)}
                />
              </FormField>
              <Button variant="primary" type="submit" disabled={busy || username === ''}>
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
            </>
          )}
          <Link to="/" style={{ fontSize: '0.875rem' }}>
            Back to sign in
          </Link>
        </form>
      </Card>
    </div>
  );
}
