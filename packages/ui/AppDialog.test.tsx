import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppDialog } from './AppDialog';

afterEach(cleanup);

const noop = () => {};

// ── visibility ────────────────────────────────────────────────────────────────

describe('AppDialog visibility', () => {
  it('does not render content when visible=false and keepMounted=false', () => {
    render(
      <AppDialog title="Test" visible={false} onClose={noop}>
        <span>content</span>
      </AppDialog>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('content')).toBeNull();
  });

  it('renders in the DOM when visible=true', () => {
    render(
      <AppDialog title="My Dialog" visible onClose={noop}>
        <span>body text</span>
      </AppDialog>,
    );
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('body text')).toBeDefined();
  });

  it('supports the open prop as alias for visible', () => {
    render(
      <AppDialog title="Open prop" open onClose={noop}>
        <span>via open</span>
      </AppDialog>,
    );
    expect(screen.getByText('via open')).toBeDefined();
  });

  it('keeps DOM mounted when keepMounted=true even if not visible', () => {
    render(
      <AppDialog title="Kept" visible={false} keepMounted onClose={noop}>
        <span>kept content</span>
      </AppDialog>,
    );
    expect(screen.getByText('kept content')).toBeDefined();
    // dialog is in DOM but hidden — use { hidden: true } to find it
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog.closest('[aria-hidden="true"]')).toBeDefined();
  });
});

// ── title ─────────────────────────────────────────────────────────────────────

describe('AppDialog title', () => {
  it('renders the title text', () => {
    render(
      <AppDialog title="Dialog Title" visible onClose={noop}>
        content
      </AppDialog>,
    );
    expect(screen.getByText('Dialog Title')).toBeDefined();
  });

  it('links title to dialog via aria-labelledby', () => {
    render(
      <AppDialog title="Accessible Title" visible onClose={noop}>
        content
      </AppDialog>,
    );
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy!);
    expect(heading?.textContent).toBe('Accessible Title');
  });
});

// ── close button ──────────────────────────────────────────────────────────────

describe('AppDialog close button', () => {
  it('shows close button by default', () => {
    render(
      <AppDialog title="T" visible onClose={noop}>
        c
      </AppDialog>,
    );
    expect(screen.getByLabelText('Close')).toBeDefined();
  });

  it('hides close button when showCloseButton=false', () => {
    render(
      <AppDialog title="T" visible showCloseButton={false} onClose={noop}>
        c
      </AppDialog>,
    );
    expect(screen.queryByLabelText('Close')).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <AppDialog title="T" visible onClose={onClose}>
        c
      </AppDialog>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ── Escape key ────────────────────────────────────────────────────────────────

describe('AppDialog Escape key', () => {
  it('calls onClose on Escape when closeOnEscape=true (default)', () => {
    const onClose = vi.fn();
    render(
      <AppDialog title="T" visible onClose={onClose}>
        c
      </AppDialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose on Escape when closeOnEscape=false', () => {
    const onClose = vi.fn();
    render(
      <AppDialog title="T" visible closeOnEscape={false} onClose={onClose}>
        c
      </AppDialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── scrim (outside click) ─────────────────────────────────────────────────────

describe('AppDialog scrim click', () => {
  it('calls onClose when scrim is clicked with closeOnOutsideClick=true (default)', () => {
    const onClose = vi.fn();
    render(
      <AppDialog title="T" visible onClose={onClose}>
        c
      </AppDialog>,
    );
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when closeOnOutsideClick=false', () => {
    const onClose = vi.fn();
    render(
      <AppDialog title="T" visible closeOnOutsideClick={false} onClose={onClose}>
        c
      </AppDialog>,
    );
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── fullScreen ────────────────────────────────────────────────────────────────

describe('AppDialog fullScreen', () => {
  it('applies nb-dialog--fullscreen class when fullScreen=true', () => {
    render(
      <AppDialog title="T" visible fullScreen onClose={noop}>
        c
      </AppDialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.classList.contains('nb-dialog--fullscreen')).toBe(true);
  });

  it('does not apply fullscreen class when fullScreen=false', () => {
    render(
      <AppDialog title="T" visible fullScreen={false} onClose={noop}>
        c
      </AppDialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.classList.contains('nb-dialog--fullscreen')).toBe(false);
  });
});

// ── footer ────────────────────────────────────────────────────────────────────

describe('AppDialog footer', () => {
  it('renders footer content when provided', () => {
    render(
      <AppDialog title="T" visible onClose={noop} footer={<button type="button">OK</button>}>
        c
      </AppDialog>,
    );
    expect(screen.getByText('OK')).toBeDefined();
  });

  it('does not render footer section when footer prop is absent', () => {
    const { container } = render(
      <AppDialog title="T" visible onClose={noop}>
        c
      </AppDialog>,
    );
    expect(container.querySelector('.nb-dialog__footer')).toBeNull();
  });
});

// ── flush ─────────────────────────────────────────────────────────────────────

describe('AppDialog flush', () => {
  it('marks the dialog so the body loses its padding and scrolling', () => {
    render(
      <AppDialog title="Settings" visible flush onClose={noop}>
        <span>content</span>
      </AppDialog>,
    );
    expect(screen.getByRole('dialog').classList.contains('nb-dialog--flush')).toBe(true);
  });

  it('keeps the padded body by default', () => {
    render(
      <AppDialog title="Settings" visible onClose={noop}>
        <span>content</span>
      </AppDialog>,
    );
    expect(screen.getByRole('dialog').classList.contains('nb-dialog--flush')).toBe(false);
  });
});

describe('AppDialog flush and nested dialogs', () => {
  it("a dialog opened inside a flush one is not itself flush, and its body is not the flush dialog's", () => {
    render(
      <AppDialog title="Outer" visible flush onClose={noop}>
        <AppDialog title="Inner" visible onClose={noop}>
          <span>inner content</span>
        </AppDialog>
      </AppDialog>,
    );
    const outer = screen.getByRole('dialog', { name: 'Outer' });
    const inner = screen.getByRole('dialog', { name: 'Inner' });
    expect(outer.classList.contains('nb-dialog--flush')).toBe(true);
    expect(inner.classList.contains('nb-dialog--flush')).toBe(false);
    // The flush rule targets the body that is a direct child of the flush dialog: only the outer one.
    expect(outer.querySelectorAll(':scope > .nb-dialog__body')).toHaveLength(1);
    expect(inner.querySelectorAll(':scope > .nb-dialog__body')).toHaveLength(1);
    expect(inner.parentElement?.closest('.nb-dialog--flush')).toBe(outer);
  });

  it("keeps the flush rules to the dialog's own body (child combinator), not any descendant", () => {
    // jsdom does not evaluate our stylesheet, so guard the selector itself: a descendant selector
    // here strips the padding of every dialog opened from inside a flush one.
    const css = readFileSync(join(process.cwd(), 'packages/ui/AppDialog.scss'), 'utf8');
    expect(css).toContain('.nb-dialog--flush > .nb-dialog__body');
    expect(css).not.toMatch(/\.nb-dialog--flush\s+\.nb-dialog__body/);
  });
});
