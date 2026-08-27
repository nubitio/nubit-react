import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Card, FormField, TextField } from '@nubitio/ui';
import { useSession } from './SessionContext';

export interface AccountPageProps {
  apiBaseUrl?: string;
}

function joinApiPath(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

interface SessionRow {
  id: number;
  createdAt?: string;
  lastUsedAt?: string;
}

interface TotpStatus {
  enrolled: boolean;
  pending: boolean;
  recoveryCodesLeft: number;
}

export function AccountPage({ apiBaseUrl = '/api/' }: AccountPageProps) {
  const { username, refresh } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [totp, setTotp] = useState<TotpStatus | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpMessage, setTotpMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const [totpResponse, sessionResponse] = await Promise.all([
        fetch(joinApiPath(apiBaseUrl, 'auth/totp'), { credentials: 'include', signal }),
        fetch(joinApiPath(apiBaseUrl, 'auth/sessions'), { credentials: 'include', signal }),
      ]);
      if (signal?.aborted) return;
      if (totpResponse.ok) {
        setTotp((await totpResponse.json()) as TotpStatus);
      }
      if (sessionResponse.ok) {
        const payload = (await sessionResponse.json()) as { sessions?: SessionRow[] };
        setSessions(payload.sessions ?? []);
      }
    },
    [apiBaseUrl],
  );

  // Abort on unmount so a slow response cannot land on a gone component, and
  // so leaving the page mid-request does not leave two fetches running.
  useEffect(() => {
    const controller = new AbortController();
    // Loading on mount is the point of this effect; the state it sets lands
    // after an await, not during render. Same escape as DateRangePicker and
    // SearchableAppDropdown.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
    });

    return () => controller.abort();
  }, [load]);

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);
    const response = await fetch(joinApiPath(apiBaseUrl, 'auth/change-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setPasswordMessage(payload?.message ?? 'Could not change password');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setPasswordMessage('Password updated.');
    await refresh();
  };

  const beginTotp = async () => {
    setTotpMessage(null);
    const response = await fetch(joinApiPath(apiBaseUrl, 'auth/totp'), {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setTotpMessage(payload?.message ?? 'Could not start enrolment');
      return;
    }
    const payload = (await response.json()) as { secret?: string; uri?: string };
    setTotpSecret(payload.uri ?? payload.secret ?? null);
    await load();
  };

  const confirmTotp = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch(joinApiPath(apiBaseUrl, 'auth/totp/confirm'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code: totpCode }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setTotpMessage(payload?.message ?? 'That code is not valid');
      return;
    }
    setTotpCode('');
    setTotpSecret(null);
    setTotpMessage('Authenticator enrolled.');
    await load();
  };

  const disableTotp = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch(joinApiPath(apiBaseUrl, 'auth/totp'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code: totpCode }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setTotpMessage(payload?.message ?? 'Could not disable the second factor');
      return;
    }
    setTotpCode('');
    setTotpMessage('Second factor removed.');
    await load();
  };

  const revokeSession = async (id: number) => {
    await fetch(joinApiPath(apiBaseUrl, `auth/sessions/${id}`), {
      method: 'DELETE',
      credentials: 'include',
    });
    await load();
  };

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 480, padding: 24 }}>
      <h1 style={{ margin: 0 }}>Account</h1>
      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{username}</p>

      <Card>
        <form
          onSubmit={changePassword}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 8 }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Password</h2>
          <FormField label="Current password">
            <TextField
              type="password"
              value={currentPassword}
              autoComplete="current-password"
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </FormField>
          <FormField label="New password">
            <TextField
              type="password"
              value={newPassword}
              autoComplete="new-password"
              minLength={8}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormField>
          {passwordMessage && <p style={{ margin: 0 }}>{passwordMessage}</p>}
          <Button variant="primary" type="submit" disabled={newPassword.length < 8}>
            Update password
          </Button>
        </form>
      </Card>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 8 }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Authenticator</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {totp?.enrolled
              ? 'A second factor is enrolled on this account.'
              : 'No second factor yet.'}
          </p>
          {totpSecret && (
            <p style={{ margin: 0, wordBreak: 'break-all', fontSize: '0.75rem' }}>{totpSecret}</p>
          )}
          <form
            onSubmit={totp?.enrolled ? disableTotp : totpSecret ? confirmTotp : beginTotp}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {(totp?.enrolled || totpSecret) && (
              <FormField label="Authenticator code">
                <TextField
                  value={totpCode}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  onChange={(e) => setTotpCode(e.target.value)}
                />
              </FormField>
            )}
            {totpMessage && <p style={{ margin: 0 }}>{totpMessage}</p>}
            <Button variant="secondary" type="submit">
              {totp?.enrolled ? 'Disable' : totpSecret ? 'Confirm' : 'Enrol'}
            </Button>
          </form>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 8 }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Sessions</h2>
          {sessions.length === 0 && (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No other sessions.</p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.875rem' }}>
                {session.lastUsedAt ?? session.createdAt ?? `Session ${session.id}`}
              </span>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => void revokeSession(session.id)}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
