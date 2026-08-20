import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/public.ts`, import.meta.url));

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ['.'],
      },
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['packages/**/*.{ts,tsx}'],
      exclude: ['packages/**/*.test.{ts,tsx}', 'packages/**/dist/**', 'packages/**/public.ts'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: {
        statements: 48,
        branches: 40,
        functions: 47,
        lines: 50,
      },
    },
    alias: {
      '@nubitio/react-admin': pkg('react-admin'),
      '@nubitio/core': pkg('core'),
      '@nubitio/ui': pkg('ui'),
      '@nubitio/admin': pkg('admin'),
      '@nubitio/crud': pkg('crud'),
      '@nubitio/hydra': pkg('hydra'),
      '@nubitio/devextreme': pkg('devextreme'),
    },
  },
});
