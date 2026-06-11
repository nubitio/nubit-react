import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AdminHeader, type AdminHeaderAction } from './AdminHeader';

afterEach(cleanup);

const noop = () => {};

// ── title ─────────────────────────────────────────────────────────────────────

describe('AdminHeader title', () => {
  it('renders the title', () => {
    render(<AdminHeader title="My App" />);
    expect(screen.getByText('My App')).toBeDefined();
  });

  it('renders without title', () => {
    render(<AdminHeader />);
    expect(screen.queryByText('My App')).toBeNull();
  });
});

// ── menu toggle ───────────────────────────────────────────────────────────────

describe('AdminHeader menu toggle', () => {
  it('shows menu toggle button when menuToggleEnabled=true', () => {
    render(<AdminHeader menuToggleEnabled toggleMenu={noop} />);
    expect(screen.getByLabelText('Toggle menu')).toBeDefined();
  });

  it('hides menu toggle button when menuToggleEnabled=false', () => {
    render(<AdminHeader menuToggleEnabled={false} />);
    expect(screen.queryByLabelText('Toggle menu')).toBeNull();
  });

  it('calls toggleMenu when menu button is clicked', () => {
    const toggleMenu = vi.fn();
    render(<AdminHeader menuToggleEnabled toggleMenu={toggleMenu} />);
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    expect(toggleMenu).toHaveBeenCalledOnce();
  });
});

// ── action buttons ────────────────────────────────────────────────────────────

describe('AdminHeader action buttons', () => {
  const actions: AdminHeaderAction[] = [
    {
      id: 'notifications',
      icon: 'ph ph-bell',
      label: 'Notificaciones',
      renderPanel: ({ close }) => (
        <div>
          <button type="button" onClick={close}>
            cerrar panel
          </button>
          panel de notificaciones
        </div>
      ),
    },
  ];

  it('renders action buttons', () => {
    render(<AdminHeader actions={actions} />);
    expect(screen.getByLabelText('Notificaciones')).toBeDefined();
  });

  it('opens action panel when button is clicked', () => {
    render(<AdminHeader actions={actions} />);
    expect(screen.queryByText('panel de notificaciones')).toBeNull();
    fireEvent.click(screen.getByLabelText('Notificaciones'));
    expect(screen.getByText('panel de notificaciones')).toBeDefined();
  });

  it('closes panel when its close callback is called', () => {
    render(<AdminHeader actions={actions} />);
    fireEvent.click(screen.getByLabelText('Notificaciones'));
    fireEvent.click(screen.getByText('cerrar panel'));
    expect(screen.queryByText('panel de notificaciones')).toBeNull();
  });

  it('closes panel on Escape key', () => {
    render(<AdminHeader actions={actions} />);
    fireEvent.click(screen.getByLabelText('Notificaciones'));
    expect(screen.getByText('panel de notificaciones')).toBeDefined();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('panel de notificaciones')).toBeNull();
  });
});

// ── badge ─────────────────────────────────────────────────────────────────────

describe('AdminHeader badge', () => {
  it('shows badge when count is positive', () => {
    const actions: AdminHeaderAction[] = [
      {
        id: 'notif',
        icon: 'ph ph-bell',
        label: 'Notifications',
        badge: 5,
        renderPanel: () => <div>panel</div>,
      },
    ];
    render(<AdminHeader actions={actions} />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('shows 99+ when badge count exceeds 99', () => {
    const actions: AdminHeaderAction[] = [
      {
        id: 'notif',
        icon: 'ph ph-bell',
        label: 'Notifications',
        badge: 150,
        renderPanel: () => <div>panel</div>,
      },
    ];
    render(<AdminHeader actions={actions} />);
    expect(screen.getByText('99+')).toBeDefined();
  });

  it('does not show badge when count is 0', () => {
    const actions: AdminHeaderAction[] = [
      {
        id: 'notif',
        icon: 'ph ph-bell',
        label: 'Notifications',
        badge: 0,
        renderPanel: () => <div>panel</div>,
      },
    ];
    render(<AdminHeader actions={actions} />);
    expect(screen.queryByText('0')).toBeNull();
  });
});

// ── user menu ─────────────────────────────────────────────────────────────────

describe('AdminHeader user menu', () => {
  it('renders the user menu trigger when renderUserMenu is provided', () => {
    render(
      <AdminHeader
        renderUserMenu={() => <div>user menu content</div>}
      />,
    );
    expect(screen.getByLabelText('User menu')).toBeDefined();
  });

  it('opens user menu on click', () => {
    render(
      <AdminHeader
        renderUserMenu={() => <div>user menu content</div>}
      />,
    );
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('user menu content')).toBeDefined();
  });
});
