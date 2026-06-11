import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock useScreenSize before importing AdminShell so module-level MediaQueryList
// initialization doesn't run against a real (missing) matchMedia.
vi.mock('./useScreenSize', () => ({
  useScreenSize: vi.fn(),
  useScreenSizeClass: vi.fn(() => 'screen-large'),
}));

import { AdminShell, type AdminMenuItem } from './AdminShell';
import * as screenSizeModule from './useScreenSize';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── helpers ───────────────────────────────────────────────────────────────────

const items: AdminMenuItem[] = [
  { text: 'Dashboard', path: '/dashboard', icon: 'house' },
  { text: 'Products', path: '/products', icon: 'package' },
];

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AdminShell title="Test App" menuItems={items}>
        {children ?? <div>main content</div>}
      </AdminShell>
    </MemoryRouter>
  );
}

function setLargeScreen() {
  vi.mocked(screenSizeModule.useScreenSize).mockReturnValue({
    isXSmall: false, isSmall: false, isMedium: false, isLarge: true,
  });
}

function setSmallScreen() {
  vi.mocked(screenSizeModule.useScreenSize).mockReturnValue({
    isXSmall: true, isSmall: false, isMedium: false, isLarge: false,
  });
}

// ── rendering ─────────────────────────────────────────────────────────────────

describe('AdminShell rendering', () => {
  beforeEach(setLargeScreen);

  it('renders children', () => {
    render(<Shell><span>hello world</span></Shell>);
    expect(screen.getByText('hello world')).toBeDefined();
  });

  it('renders the title in the header', () => {
    render(<Shell />);
    expect(screen.getByText('Test App')).toBeDefined();
  });

  it('renders menu items in the sidebar', () => {
    render(<Shell />);
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Products')).toBeDefined();
  });
});

// ── menu state on large screen ────────────────────────────────────────────────

describe('AdminShell menu state — large screen', () => {
  beforeEach(setLargeScreen);

  it('starts with menu open on large screens', () => {
    render(<Shell />);
    const body = document.querySelector('.nb-admin-shell__body');
    expect(body?.classList.contains('is-open')).toBe(true);
  });

  it('toggle button closes the menu', () => {
    render(<Shell />);
    const body = document.querySelector('.nb-admin-shell__body');
    expect(body?.classList.contains('is-open')).toBe(true);
    act(() => { fireEvent.click(screen.getByLabelText('Toggle menu')); });
    expect(body?.classList.contains('is-closed')).toBe(true);
  });

  it('toggle button re-opens a closed menu', () => {
    render(<Shell />);
    const btn = screen.getByLabelText('Toggle menu');
    act(() => fireEvent.click(btn));
    act(() => fireEvent.click(btn));
    const body = document.querySelector('.nb-admin-shell__body');
    expect(body?.classList.contains('is-open')).toBe(true);
  });
});

// ── menu state on small screen ────────────────────────────────────────────────

describe('AdminShell menu state — small screen', () => {
  beforeEach(setSmallScreen);

  it('starts with menu closed on small screens', () => {
    render(<Shell />);
    const body = document.querySelector('.nb-admin-shell__body');
    expect(body?.classList.contains('is-closed')).toBe(true);
  });

  it('scrim overlay is shown when menu is open on small screen', () => {
    render(<Shell />);
    act(() => { fireEvent.click(screen.getByLabelText('Toggle menu')); });
    expect(document.querySelector('.nb-admin-shell__scrim')).not.toBeNull();
  });

  it('scrim click closes the menu', () => {
    render(<Shell />);
    act(() => fireEvent.click(screen.getByLabelText('Toggle menu')));
    const scrim = document.querySelector('.nb-admin-shell__scrim') as HTMLElement;
    act(() => fireEvent.click(scrim));
    const body = document.querySelector('.nb-admin-shell__body');
    expect(body?.classList.contains('is-closed')).toBe(true);
  });
});

// ── slots ─────────────────────────────────────────────────────────────────────

describe('AdminShell slots', () => {
  beforeEach(setLargeScreen);

  it('renders footer slot', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AdminShell title="T" menuItems={[]} footer={<span>My Footer</span>}>
          content
        </AdminShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('My Footer')).toBeDefined();
  });

  it('renders theme switcher slot', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AdminShell
          title="T"
          menuItems={[]}
          renderThemeSwitcher={() => <button type="button">theme</button>}
        >
          content
        </AdminShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('theme')).toBeDefined();
  });
});
