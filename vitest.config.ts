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
    include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx'],
    alias: {
      '@nubitio/react-admin': pkg('react-admin'),
      '@nubitio/core': pkg('core'),
      '@nubitio/ui': pkg('ui'),
      '@nubitio/admin': pkg('admin'),
      '@nubitio/crud': pkg('crud'),
      '@nubitio/hydra': pkg('hydra'),
    },
  },
});
