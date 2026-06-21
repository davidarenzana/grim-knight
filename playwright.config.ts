import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end + visual-regression tests (Testing plan Layer 4). These boot the
 * real production build in a browser and drive it like a player — the only layer
 * that can catch the visual/integration bug classes the headless suites can't.
 *
 * Run: `pnpm test:e2e` (baselines: `pnpm test:e2e:update`). Screenshots are
 * platform-specific (committed baselines are whatever OS generated them); run on
 * a matching OS/container or regenerate.
 */
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  // Tolerate sub-pixel font/AA differences so snapshots aren't brittle.
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
