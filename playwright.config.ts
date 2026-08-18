import { defineConfig } from '@playwright/test'

const PORT = 5174
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A layout measurement that only holds on the second attempt did not hold.
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    // The popup is a fixed-width surface, so the viewport must not be what
    // decides its layout: otherwise a stability measurement means nothing.
    viewport: { width: 480, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm dev --port ${PORT} --strictPort`,
    url: `${BASE_URL}/src/popup/index.html`,
    reuseExistingServer: true,
    stdout: 'ignore',
  },
})
