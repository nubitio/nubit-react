import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type SessionProfile = {
  username: string;
  roles: string[];
};

export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; profile: SessionProfile };

export interface SessionProviderConfig {
  /** API base URL, e.g. `/api/`. */
  apiBaseUrl?: string;
  /** Profile endpoint relative to apiBaseUrl. @default `me` */
  mePath?: string;
  /** Logout endpoint relative to apiBaseUrl. @default `auth/logout` */
  logoutPath?: string;
}

export interface SessionContextValue {
  session: SessionState;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  roles: string[];
  username: string | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function joinApiPath(apiBaseUrl: string, path: string): string {
  return `${apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function SessionProvider({
  apiBaseUrl = '/api/',
  mePath = 'me',
  logoutPath = 'auth/logout',
  children,
}: SessionProviderConfig & { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(joinApiPath(apiBaseUrl, mePath), { credentials: 'include' });
      if (!response.ok) {
        setSession({ status: 'anonymous' });
        return;
      }

      const profile = (await response.json()) as SessionProfile;
      setSession({ status: 'authenticated', profile });
    } catch {
      setSession({ status: 'anonymous' });
    }
  }, [apiBaseUrl, mePath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch(joinApiPath(apiBaseUrl, logoutPath), {
      method: 'POST',
      credentials: 'include',
    });
    setSession({ status: 'anonymous' });
  }, [apiBaseUrl, logoutPath]);

  const value = useMemo<SessionContextValue>(() => ({
    session,
    refresh,
    logout,
    roles: session.status === 'authenticated' ? session.profile.roles : [],
    username: session.status === 'authenticated' ? session.profile.username : null,
  }), [logout, refresh, session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a <SessionProvider>.');
  }
  return context;
}