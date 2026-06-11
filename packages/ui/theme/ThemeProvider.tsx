import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  switchTheme: () => void;
  isLoaded: boolean;
}

export const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export interface ThemeProviderProps {
  storageKey?: string;
  themePrefix?: string;
  basePath?: string;
  children: React.ReactNode;
}

const themeModes: ThemeMode[] = ['light', 'dark', 'auto'];
const themeValues: Theme[] = ['light', 'dark'];

function getNextThemeMode(mode: ThemeMode): ThemeMode {
  return themeModes[(themeModes.indexOf(mode) + 1) % themeModes.length];
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode, systemTheme = getSystemTheme()): Theme {
  if (mode !== 'auto') return mode;
  return systemTheme;
}

// Append build-time cache-bust so hard-refreshes always get the latest CSS.
// __THEME_VERSION__ is replaced at build time; falls back to a timestamp in dev.
declare const __THEME_VERSION__: string | undefined;
const THEME_VERSION =
  typeof __THEME_VERSION__ !== 'undefined' ? __THEME_VERSION__ : String(Date.now());

function setThemeToDOM(href: string): Promise<void> {
  const versioned = `${href}?v=${THEME_VERSION}`;
  return new Promise((resolve) => {
    const id = 'theme-link';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (link) {
      if (link.getAttribute('data-theme-href') === href) { resolve(); return; }
      link.href = versioned;
      link.setAttribute('data-theme-href', href);
    } else {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = versioned;
      link.setAttribute('data-theme-href', href);
      document.head.appendChild(link);
    }
    link.onload = () => resolve();
  });
}

function applyThemeAttributes(theme: Theme, themePrefix: string): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  themeValues.forEach((value) => root.classList.remove(`${themePrefix}${value}`));
  root.classList.add(`${themePrefix}${theme}`);
}

export const ThemeProvider = ({
  storageKey = 'nb-theme',
  themePrefix = 'nb-theme-',
  basePath = '/themes/',
  children,
}: ThemeProviderProps) => {
  const getPersistedMode = (): ThemeMode => {
    const persisted = window.localStorage.getItem(storageKey) as ThemeMode | null;
    return persisted && themeModes.includes(persisted) ? persisted : 'auto';
  };

  const [mode, setMode] = useState<ThemeMode>(getPersistedMode);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);
  const [isLoaded, setIsLoaded] = useState(false);
  const theme = useMemo(() => resolveTheme(mode, systemTheme), [mode, systemTheme]);

  useEffect(() => {
    applyThemeAttributes(theme, themePrefix);
    void setThemeToDOM(`${basePath}${themePrefix}${theme}.css`).then(() => setIsLoaded(true));
  }, [theme, basePath, themePrefix]);

  useEffect(() => {
    if (!isLoaded) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const baseBg = getComputedStyle(document.body).getPropertyValue('--base-bg').trim();
      meta.setAttribute('content', baseBg || (theme === 'dark' ? '#000000' : '#ffffff'));
    }
  }, [theme, isLoaded]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setSystemTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const switchTheme = useCallback(() => {
    setMode((prev) => {
      const next = getNextThemeMode(prev);
      window.localStorage.setItem(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const value = useMemo(
    () => ({ theme, mode, switchTheme, isLoaded }),
    [theme, mode, switchTheme, isLoaded],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
