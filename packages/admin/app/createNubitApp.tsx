import React, { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoreConfigProvider, CoreProvider, MercureProvider } from '@nubitio/core';
import { DevToolsProvider, isDevEnvironment, SmartCrudRolesProvider } from '@nubitio/crud';
import { NubitDevToolsPanel } from '../devtools/NubitDevToolsPanel';
import {
  HydraResourceSchemaProvider,
  HydraResourceStoreProvider,
  SchemaProvider,
} from '@nubitio/hydra';
import { ThemeProvider, ThemeSwitcher } from '@nubitio/ui';

import { AdminShell } from '../AdminShell';
import { LoginPage } from '../auth/LoginPage';
import { SessionProvider, useSession } from '../auth/SessionContext';
import { ToastHost } from '../runtime/ToastHost';
import { useAppRuntime } from '../runtime/useAppRuntime';
import { filterMenuByRoles, resolveAppMenu } from './filterMenuByRoles';
import type {
  CreateNubitAppConfig,
  NubitApp,
  NubitAppMenuContext,
  NubitAppUserMenuContext,
} from './types';

function defaultUserMenu({ username, close, logout }: NubitAppUserMenuContext) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{username ?? 'User'}</span>
      <button
        type="button"
        onClick={() => {
          close();
          void logout();
        }}
      >
        Sign out
      </button>
    </div>
  );
}

function buildMenuContext(
  session: ReturnType<typeof useSession>,
): NubitAppMenuContext {
  const profile = session.session.status === 'authenticated' ? session.session.profile : undefined;

  return {
    roles: session.roles,
    username: session.username,
    session: session.session,
    appProfile: profile?.appProfile,
    logout: session.logout,
  };
}

function resolveShellMenu(config: CreateNubitAppConfig, ctx: NubitAppMenuContext) {
  const declared = resolveAppMenu(config.menu, ctx);
  const roleScoped = declared.some((item) => item.roles !== undefined || item.items?.some((sub) => sub.roles !== undefined))
    ? filterMenuByRoles(declared, ctx.roles)
    : declared.map(({ text, path, icon, items }) => ({ text, path, icon, items }));

  return config.filterMenu ? config.filterMenu(roleScoped, ctx) : roleScoped;
}

function NubitAuthenticatedApp({ config }: { config: CreateNubitAppConfig }) {
  const session = useSession();
  const { runtime, toasts, dismiss } = useAppRuntime();
  const apiBaseUrl = config.apiBaseUrl ?? '/api/';
  const homePath = config.homePath ?? config.routes[0]?.path ?? '/';
  const menuContext = useMemo(() => buildMenuContext(session), [session]);
  const menuItems = useMemo(
    () => (session.session.status === 'authenticated' ? resolveShellMenu(config, menuContext) : []),
    [config, menuContext, session.session.status],
  );

  const renderThemeSwitcher = config.renderThemeSwitcher ?? (() => <ThemeSwitcher />);
  const renderUserMenu = config.renderUserMenu ?? defaultUserMenu;
  const Wrapper = config.Wrapper ?? React.Fragment;

  if (session.session.status === 'loading') {
    return null;
  }

  const shell = (
    <AdminShell
      title={config.title}
      menuItems={menuItems}
      headerActions={config.shell?.headerActions}
      footer={config.shell?.footer}
      renderThemeSwitcher={renderThemeSwitcher}
      renderUserMenu={({ close }) => renderUserMenu({ ...menuContext, close })}
    >
      <Routes>
        <Route path="/" element={<Navigate to={homePath} replace />} />
        {config.routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Routes>
    </AdminShell>
  );

  const devToolsEnabled = config.devTools ?? isDevEnvironment();

  const authenticated = (
    <DevToolsProvider enabled={devToolsEnabled}>
      <CoreProvider
        http={{ baseUrl: apiBaseUrl, refreshPath: 'auth/refresh', loginPath: 'auth/login' }}
        runtime={runtime}
      >
        <CoreConfigProvider
          apiBaseUrl={apiBaseUrl}
          locale={config.locale ?? 'en'}
          timezone={config.timezone ?? 'UTC'}
          currency={config.currency ?? 'USD'}
        >
          <SmartCrudRolesProvider roles={session.roles}>
            <BrowserRouter>
              <Wrapper>
                {config.hydra === false ? (
                  shell
                ) : (
                  <MercureProvider>
                    <SchemaProvider>
                      <HydraResourceSchemaProvider>
                        <HydraResourceStoreProvider>{shell}</HydraResourceStoreProvider>
                      </HydraResourceSchemaProvider>
                    </SchemaProvider>
                  </MercureProvider>
                )}
              </Wrapper>
            </BrowserRouter>
            <ToastHost toasts={toasts} onDismiss={dismiss} />
            {devToolsEnabled && <NubitDevToolsPanel />}
          </SmartCrudRolesProvider>
        </CoreConfigProvider>
      </CoreProvider>
    </DevToolsProvider>
  );

  if (session.session.status === 'authenticated') {
    return authenticated;
  }

  return (
    <BrowserRouter>
      <LoginPage
        apiBaseUrl={apiBaseUrl}
        title={config.login?.title ?? config.title}
        hint={config.login?.hint}
        defaultUsername={config.login?.defaultUsername}
        onLoggedIn={() => void session.refresh()}
      />
    </BrowserRouter>
  );
}

export function createNubitApp(config: CreateNubitAppConfig): NubitApp {
  const queryClient = config.queryClient ?? new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  });
  const apiBaseUrl = config.apiBaseUrl ?? '/api/';

  function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SessionProvider apiBaseUrl={apiBaseUrl}>
            <NubitAuthenticatedApp config={config} />
          </SessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return { App };
}