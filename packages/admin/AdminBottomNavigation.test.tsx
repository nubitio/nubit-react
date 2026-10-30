import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AdminBottomNavigation } from './AdminBottomNavigation';

afterEach(cleanup);

function Location() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}

describe('AdminBottomNavigation', () => {
  it('selects the longest matching destination and navigates with links', () => {
    render(
      <MemoryRouter initialEntries={['/sales/quotes/42']}>
        <AdminBottomNavigation
          label="Workspace navigation"
          items={[
            { text: 'Home', path: '/', icon: 'house' },
            { text: 'Sales', path: '/sales/', icon: 'ph ph-receipt' },
            { text: 'Quotes', path: '/sales/quotes', badge: 2 },
          ]}
        />
        <Location />
      </MemoryRouter>,
    );
    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Quotes 2' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getByRole('link', { name: 'Sales' }).getAttribute('aria-current')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(screen.getByLabelText('Current route').textContent).toBe('/');
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
  });

  it('does not select partial segment matches', () => {
    render(
      <MemoryRouter initialEntries={['/sales-archive']}>
        <AdminBottomNavigation items={[{ text: 'Sales', path: '/sales' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link').getAttribute('aria-current')).toBeNull();
  });
});
