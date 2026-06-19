import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('../useScreenSize', () => ({
  useScreenSize: vi.fn(() => ({
    isXSmall: false,
    isSmall: false,
    isMedium: false,
    isLarge: true,
  })),
  useScreenSizeClass: vi.fn(() => 'screen-large'),
}));

import { createNubitApp } from './createNubitApp';

const internalProfile = {
  username: 'admin@example.com',
  roles: ['ROLE_ADMIN'],
  appProfile: 'internal' as const,
};

function mockMeResponse(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/me')) {
        return {
          ok: status === 200,
          status,
          json: async () => body,
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createNubitApp', () => {
  beforeEach(() => {
    mockMeResponse(200, internalProfile);
  });

  it('boots the shell with declarative menu and routes for an internal session', async () => {
    const { App } = createNubitApp({
      title: 'Nubit Admin',
      homePath: '/products',
      menu: [
        { text: 'Products', icon: 'ph ph-package', path: '/products' },
        { text: 'Customers', icon: 'ph ph-users', path: '/customers', roles: 'ROLE_KITCHEN' },
      ],
      routes: [
        { path: '/products', element: <div>products page</div> },
        { path: '/customers', element: <div>customers page</div> },
      ],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Nubit Admin')).toBeTruthy();
      expect(screen.getByText('products page')).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: 'Products' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Customers' })).toBeNull();
  });

  it('shows the login page when /api/me is unauthorized', async () => {
    mockMeResponse(401);

    const { App } = createNubitApp({
      title: 'Nubit Admin',
      menu: [],
      routes: [{ path: '/products', element: <div>products page</div> }],
      login: {
        defaultUsername: 'admin@example.com',
        hint: 'Demo credentials',
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Email')).toBeTruthy();
      expect(screen.getByText('Demo credentials')).toBeTruthy();
    });

    expect(screen.queryByText('products page')).toBeNull();
  });

  it('applies a custom filterMenu callback after role filtering', async () => {
    const { App } = createNubitApp({
      title: 'Ops Panel',
      menu: [
        { text: 'Dashboard', path: '/dashboard' },
        { text: 'Reports', path: '/reports' },
      ],
      routes: [{ path: '/dashboard', element: <div>dashboard page</div> }],
      filterMenu: (items) => items.filter((item) => item.text !== 'Reports'),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dashboard' })).toBeTruthy();
    });

    expect(screen.queryByRole('button', { name: 'Reports' })).toBeNull();
  });
});