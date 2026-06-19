import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, TextField } from '@nubitio/ui';

export type RegisterFieldType = 'text' | 'email' | 'password' | 'select';

export interface RegisterSelectOption {
  value: string;
  label: string;
}

export interface RegisterField {
  /** JSON body key sent to the register endpoint. */
  name: string;
  placeholder?: string;
  type?: RegisterFieldType;
  defaultValue?: string;
  autoComplete?: string;
  options?: RegisterSelectOption[];
}

export interface RegisterPageProps {
  fields: RegisterField[];
  onRegistered: () => void;
  apiBaseUrl?: string;
  registerPath?: string;
  title?: string;
  hint?: string;
  submitLabel?: string;
  busyLabel?: string;
  loginLink?: { to: string; label: string };
  loginPrompt?: string;
}

function joinApiPath(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function initialValues(fields: RegisterField[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.defaultValue ?? '']),
  );
}

export function RegisterPage({
  fields,
  onRegistered,
  apiBaseUrl = '/api/',
  registerPath = 'auth/register',
  title = 'Create account',
  hint,
  submitLabel = 'Create account',
  busyLabel = 'Creating…',
  loginLink,
  loginPrompt = 'Already have an account?',
}: RegisterPageProps) {
  const defaults = useMemo(() => initialValues(fields), [fields]);
  const [values, setValues] = useState(defaults);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(joinApiPath(apiBaseUrl, registerPath), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? body?.message ?? 'Registration failed');
        return;
      }
      onRegistered();
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
          style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 360, padding: 8 }}
        >
          <h2 style={{ margin: 0 }}>{title}</h2>
          {hint && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{hint}</p>}
          {fields.map((field) => {
            const type = field.type ?? 'text';
            if (type === 'select') {
              return (
                <select
                  key={field.name}
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  style={{ width: '100%' }}
                  aria-label={field.placeholder ?? field.name}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              );
            }
            return (
              <TextField
                key={field.name}
                placeholder={field.placeholder}
                type={type === 'password' ? 'password' : type === 'email' ? 'email' : 'text'}
                value={values[field.name] ?? ''}
                autoComplete={field.autoComplete}
                onChange={(e) => setValue(field.name, e.target.value)}
              />
            );
          })}
          {error && <p style={{ margin: 0, color: 'var(--error-color, #dc2626)' }}>{error}</p>}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? busyLabel : submitLabel}
          </Button>
          {loginLink && (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {loginPrompt} <Link to={loginLink.to}>{loginLink.label}</Link>
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}