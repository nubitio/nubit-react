import React, { useMemo } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoreConfigProvider, CoreProvider, MercureProvider } from '@nubitio/core';
import {
  DevToolsProvider,
  isDevEnvironment,
  SessionPermissionsProvider,
  SmartCrudRolesProvider,
} from '@nubitio/crud';
import { NubitDevToolsPanel } from '../devtools/NubitDevToolsPanel';
import {
  HydraResourceSchemaProvider,
  HydraResourceStoreProvider,
  SchemaProvider,
} from '@nubitio/hydra';
import { Skeleton, ThemeProvider, ThemeSwitcher } from '@nubitio/ui';

import { AdminShell } from '../AdminShell';
import { AcceptInvitationPage } from '../auth/AcceptInvitationPage';
import { AccountPage } from '../auth/AccountPage';
import { ForgotPasswordPage } from '../auth/ForgotPasswordPage';
import { LoginPage } from '../auth/LoginPage';
import { ResetPasswordPage } from '../auth/ResetPasswordPage';
import { SessionProvider, useSession } from '../auth/SessionContext';
import { ToastHost } from '../runtime/ToastHost';
import { useAppRuntime } from '../runtime/useAppRuntime';
import { ErrorBoundary } from './ErrorBoundary';
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
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        {username ?? 'User'}
      </span>
      <Link to="/account" onClick={close}>
        Account
      </Link>
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

function buildMenuContext(session: ReturnType<typeof useSession>): NubitAppMenuContext {
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
  const roleScoped = declared.some(
    (item) => item.roles !== undefined || item.items?.some((sub) => sub.roles !== undefined),
  )
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
  const profile = session.session.status === 'authenticated' ? session.session.profile : undefined;

  if (session.session.status === 'loading') {
    return (
      <div style={{ padding: 24 }} aria-busy="true" aria-label="Loading session">
        <Skeleton variant="rect" height={32} width="33%" />
        <div style={{ height: 16 }} />
        <Skeleton variant="rect" height={256} />
      </div>
    );
  }

  const hasAccountRoute = config.routes.some((route) => route.path === '/account');

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
        {!hasAccountRoute && (
          <Route path="/account" element={<AccountPage apiBaseUrl={apiBaseUrl} />} />
        )}
      </Routes>
    </AdminShell>
  );

  const devToolsEnabled = config.devTools ?? isDevEnvironment();

  const authenticated = (
    <ErrorBoundary>
      <DevToolsProvider enabled={devToolsEnabled}>
        <CoreProvider
          http={{
            baseUrl: apiBaseUrl,
            refreshPath: 'auth/refresh',
            loginPath: 'auth/login',
            onUnauthorized: () => {
              void session.logout();
            },
          }}
          runtime={runtime}
        >
          <CoreConfigProvider
            apiBaseUrl={apiBaseUrl}
            locale={config.locale ?? 'en'}
            timezone={profile?.timeZone ?? config.timezone ?? 'UTC'}
            currency={config.currency ?? 'USD'}
          >
            <SmartCrudRolesProvider roles={session.roles}>
              <SessionPermissionsProvider
                permissions={profile?.permissions}
                limits={profile?.limits}
              >
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
              </SessionPermissionsProvider>
            </SmartCrudRolesProvider>
          </CoreConfigProvider>
        </CoreProvider>
      </DevToolsProvider>
    </ErrorBoundary>
  );

  if (session.session.status === 'authenticated') {
    return authenticated;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage apiBaseUrl={apiBaseUrl} />} />
        <Route path="/reset-password" element={<ResetPasswordPage apiBaseUrl={apiBaseUrl} />} />
        <Route
          path="/invitations/:token/accept"
          element={<AcceptInvitationPage apiBaseUrl={apiBaseUrl} />}
        />
        <Route
          path="*"
          element={
            <LoginPage
              apiBaseUrl={apiBaseUrl}
              title={config.login?.title ?? config.title}
              hint={config.login?.hint}
              defaultUsername={config.login?.defaultUsername}
              oidcProviders={config.login?.oidcProviders}
              onLoggedIn={() => void session.refresh()}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export function createNubitApp(config: CreateNubitAppConfig): NubitApp {
  const queryClient =
    config.queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
    });
  const apiBaseUrl = config.apiBaseUrl ?? '/api/';

  function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider basePath={config.themeBasePath}>
          <SessionProvider apiBaseUrl={apiBaseUrl}>
            <NubitAuthenticatedApp config={config} />
          </SessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return { App };
}
