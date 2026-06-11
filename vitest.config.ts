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
      '@nubit/react-admin': pkg('react-admin'),
      '@nubit/core': pkg('core'),
      '@nubit/ui': pkg('ui'),
      '@nubit/admin': pkg('admin'),
      '@nubit/crud': pkg('crud'),
      '@nubit/hydra': pkg('hydra'),
    },
  },
});
