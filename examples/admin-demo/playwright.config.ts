import { defineConfig } from '@playwright/test';

const PORT = 5199;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `sh -c "cd ../.. && pnpm build && cd examples/admin-demo && node scripts/copy-themes.mjs && pnpm build && pnpm exec vite preview --host 127.0.0.1 --port ${PORT}"`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});