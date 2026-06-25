import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vitest.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // The core runs headless in 'node'. UI/DOM tests opt into jsdom per file with
    // a docblock: `// @vitest-environment jsdom` at the top of the test file.
    environment: 'node',
    // The serverless function in `api/` is application logic (validate/insert/
    // persist) and MUST be tested like the rest — a missing test there shipped a
    // production crash once. Discover its tests alongside `src/`.
    include: ['src/**/*.{test,spec}.ts', 'api/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Report the WHOLE app so the real gap is visible (engine/UI are largely
      // untested today). `all: true` lists files even when no test imports them.
      all: true,
      include: ['src/**/*.{ts,vue}', 'api/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'api/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        'src/main.ts', // app bootstrap, no logic to assert
        'src/engine/assets/**', // asset manifests/loaders (verified visually)
      ],
      thresholds: {
        // Quality contract: the pure logic core must stay highly covered. The
        // engine/UI are reported but NOT yet enforced — ratchet thresholds up as
        // the integration/component/E2E layers land (see docs/TESTING-PLAN.md).
        'src/core/**': {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        // The one backend seam is enforced too, so it can never regress to the
        // untested state that let `FUNCTION_INVOCATION_FAILED` ship.
        'api/**': {
          lines: 90,
          functions: 90,
          branches: 80,
          statements: 90,
        },
      },
    },
  },
})
