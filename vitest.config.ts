import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Use jsdom for component tests
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000, // 10 second timeout per test
    hookTimeout: 10000, // 10 second timeout for hooks
    pool: 'forks', // Use forks for better isolation
    poolOptions: {
      forks: {
        // Node 25 exposes experimental global localStorage behind Web Storage.
        // Supabase probes globalThis.localStorage during module import, before
        // jsdom can safely own the browser storage contract for tests.
        execArgv: ['--no-experimental-webstorage'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/routes/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      drizzle: fileURLToPath(new URL('./drizzle', import.meta.url)),
    },
  },
})
