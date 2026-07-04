import { useEffect } from 'react';

export interface DevExtremeThemeSyncProps {
  /**
   * Directory served at runtime with `dx.light.css` and `dx.dark.css`.
   * Copy `devextreme/dist/css/dx.{light,dark}.css` (+ fonts/icons) into
   * your public folder, same pattern as @nubitio/ui themes.
   */
  basePath?: string;
}

function readNubitTheme(): 'light' | 'dark' {
  const theme = document.documentElement.dataset.theme;
  if (theme === 'dark' || theme === 'light') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyDevExtremeTheme(theme: 'light' | 'dark', basePath: string): void {
  const href = `${basePath}dx.${theme}.css`;
  const id = 'nb-devextreme-theme-link';
  let link = document.getElementById(id) as HTMLLinkElement | null;

  if (link?.getAttribute('data-dx-theme-href') === href) return;

  if (link) {
    link.href = href;
    link.setAttribute('data-dx-theme-href', href);
    return;
  }

  link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-dx-theme-href', href);
  document.head.appendChild(link);
}

/**
 * Swaps DevExtreme base theme CSS when Nubit `data-theme` changes.
 * Mount once inside `ThemeProvider` (typically via `DevExtremeCrudProvider`).
 */
export function DevExtremeThemeSync({ basePath = '/devextreme-themes/' }: DevExtremeThemeSyncProps) {
  useEffect(() => {
    const sync = () => applyDevExtremeTheme(readNubitTheme(), basePath);
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (!document.documentElement.dataset.theme) sync();
    };
    mq.addEventListener('change', onSystemChange);

    return () => {
      observer.disconnect();
      mq.removeEventListener('change', onSystemChange);
    };
  }, [basePath]);

  return null;
}