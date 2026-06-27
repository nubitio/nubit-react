import type { CrudHints } from './types';

const warned = new Set<string>();

function isDev(): boolean {
  return typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.localhost')
  );
}

/** Warn once per session when legacy x-crud keys are used. */
export function warnDeprecatedCrudHints(hints: CrudHints | undefined, fieldName: string): void {
  if (!hints || !isDev()) return;

  if (hints.hidden !== undefined && hints.hideInGrid === undefined) {
    const key = `hidden:${fieldName}`;
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(
        `[Nubit] x-crud.hidden on "${fieldName}" is deprecated — use hideInGrid instead.`,
      );
    }
  }

  if (hints.visibleOnForm !== undefined && hints.showInForm === undefined) {
    const key = `visibleOnForm:${fieldName}`;
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(
        `[Nubit] x-crud.visibleOnForm on "${fieldName}" is deprecated — use showInForm instead.`,
      );
    }
  }
}