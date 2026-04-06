import { defineConfig } from '@playwright/test'

const nodeCommand = `"${process.execPath}"`.replaceAll('\\', '/')

export default defineConfig({
  testDir: './tests/system',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 960 },
  },
  webServer: [
    {
      command: `${nodeCommand} ./scripts/e2e/start-backend.mjs`,
      url: 'http://127.0.0.1:8001/up',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: '.',
    },
    {
      command: `${nodeCommand} ./scripts/e2e/start-frontend.mjs`,
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: '.',
    },
  ],
})
