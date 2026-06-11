/**
 * Tests for the viewMode resolver and the CrudFormShell dispatcher.
 *
 * These are intentionally light — the end-to-end behavior of each shell
 * (focus trap, scrim click, escape close, etc.) is covered by the existing
 * CrudDialogView tests. What this file verifies is the wiring contract:
 *   - `resolveViewMode` normalises both shorthand and object forms,
 *   - `CrudFormShell` dispatches to the correct shell based on `viewMode`,
 *   - missing `viewMode` falls back to dialog (no breaking change for
 *     resources that haven't been migrated yet).
 */
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { initCoreI18n } from '@nubit/core';
import { CrudFormShell, resolveViewMode } from './index';

beforeAll(() => {
  if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      ns: ['core'],
      defaultNS: 'core',
      resources: {},
      interpolation: { escapeValue: false },
    });
  }
  initCoreI18n();
});

afterAll(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const noop = () => undefined;

describe('resolveViewMode', () => {
  it('returns the dialog defaults when viewMode is undefined', () => {
    expect(resolveViewMode(undefined)).toEqual({
      mode: 'dialog',
      drawerWidth: 'min(880px, 60vw)',
      drawerSide: 'right',
    });
  });

  it('preserves the mode for shorthand values', () => {
    expect(resolveViewMode('drawer').mode).toBe('drawer');
    expect(resolveViewMode('page').mode).toBe('page');
    expect(resolveViewMode('dialog').mode).toBe('dialog');
  });

  it('keeps default drawer dimensions for shorthand drawer', () => {
    expect(resolveViewMode('drawer')).toEqual({
      mode: 'drawer',
      drawerWidth: 'min(880px, 60vw)',
      drawerSide: 'right',
    });
  });

  it('honours custom drawerWidth and drawerSide in object form', () => {
    expect(resolveViewMode({ mode: 'drawer', drawerWidth: 480, drawerSide: 'left' })).toEqual({
      mode: 'drawer',
      drawerWidth: 480,
      drawerSide: 'left',
    });
  });

  it('resolves drawerSize tokens to pixel widths', () => {
    expect(resolveViewMode({ mode: 'drawer', drawerSize: 'md' })).toEqual({
      mode: 'drawer',
      drawerWidth: 640,
      drawerSide: 'right',
      drawerSize: 'md',
    });
  });

  it('prefers explicit drawerWidth over drawerSize', () => {
    expect(resolveViewMode({ mode: 'drawer', drawerSize: 'md', drawerWidth: 880 })).toEqual({
      mode: 'drawer',
      drawerWidth: 880,
      drawerSide: 'right',
      drawerSize: 'md',
    });
  });
});

describe('CrudFormShell dispatch', () => {
  it('renders dialog shell for viewMode: dialog', () => {
    render(
      <CrudFormShell
        viewMode={resolveViewMode('dialog')}
        isOpen
        mode="add"
        title="Add product"
        onClose={noop}
        onCancel={noop}
        onSave={noop}
      >
        <span>FORM BODY</span>
      </CrudFormShell>,
    );
    expect(document.body.querySelector('.nb-crud-dialog')).toBeTruthy();
  });

  it('renders drawer shell for viewMode: drawer', () => {
    render(
      <CrudFormShell
        viewMode={resolveViewMode('drawer')}
        isOpen
        mode="add"
        title="Add product"
        onClose={noop}
        onCancel={noop}
        onSave={noop}
      >
        <span>FORM BODY</span>
      </CrudFormShell>,
    );
    expect(document.body.querySelector('.nb-drawer')).toBeTruthy();
    expect(document.body.querySelector('.nb-drawer-root--right')).toBeTruthy();
  });

  it('renders page shell for viewMode: page', () => {
    render(
      <CrudFormShell
        viewMode={resolveViewMode('page')}
        isOpen
        mode="add"
        title="Add product"
        onClose={noop}
        onCancel={noop}
        onSave={noop}
      >
        <span>FORM BODY</span>
      </CrudFormShell>,
    );
    expect(screen.getByText('Add product')).toBeTruthy();
    expect(screen.getByText('FORM BODY')).toBeTruthy();
  });

  it('returns null for the page shell when isOpen is false', () => {
    const { container } = render(
      <CrudFormShell
        viewMode={resolveViewMode('page')}
        isOpen={false}
        mode="add"
        title="Add product"
        onClose={noop}
        onCancel={noop}
        onSave={noop}
      >
        <span>FORM BODY</span>
      </CrudFormShell>,
    );
    expect(container.querySelector('.nb-crud-page-shell')).toBeNull();
  });

  it('drawer shell reflects a left-side configuration', () => {
    render(
      <CrudFormShell
        viewMode={resolveViewMode({ mode: 'drawer', drawerSide: 'left' })}
        isOpen
        mode="edit"
        title="Edit product"
        onClose={noop}
        onCancel={noop}
        onSave={noop}
      >
        <span>FORM BODY</span>
      </CrudFormShell>,
    );
    expect(document.body.querySelector('.nb-drawer-root--left')).toBeTruthy();
  });
});
