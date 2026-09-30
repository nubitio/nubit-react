import { afterEach, describe, expect, it } from 'vitest';
import { readCsrfToken } from './csrf';

function setCookie(value: string) {
  document.cookie = value;
}

afterEach(() => {
  for (const name of ['CSRF_TOKEN', 'other', 'custom']) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
});

describe('readCsrfToken', () => {
  it('returns undefined before login has issued the cookie', () => {
    expect(readCsrfToken()).toBeUndefined();
  });

  it('reads the CSRF_TOKEN cookie among others', () => {
    setCookie('other=1; path=/');
    setCookie('CSRF_TOKEN=abc123; path=/');
    expect(readCsrfToken()).toBe('abc123');
  });

  it('does not match a cookie whose name merely ends with the target', () => {
    setCookie('X_CSRF_TOKEN=nope; path=/');
    expect(readCsrfToken()).toBeUndefined();
    document.cookie = 'X_CSRF_TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('decodes percent-encoded values and honours a custom cookie name', () => {
    setCookie('custom=a%2Fb; path=/');
    expect(readCsrfToken('custom')).toBe('a/b');
  });
});
