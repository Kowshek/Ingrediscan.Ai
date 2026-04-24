import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    // Use the automatic JSX runtime so test files don't need to import React.
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'tests/unit/**/*.test.{js,jsx,ts}'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // Only measure coverage on logic/utility files that have unit tests.
      // React UI components are covered by E2E, not unit tests.
      // The Deno edge function index.ts runs in a different runtime entirely.
      include: [
        'src/lib/**/*.{js,ts}',
        'src/utils/**/*.{js,ts}',
        'supabase/functions/_shared/**/*.ts',
      ],
      exclude: [
        'src/**/*.test.{js,jsx,ts}',
        '**/node_modules/**',
      ],
      thresholds: {
        lines: 80,
        functions: 70,
        branches: 70,
        statements: 80,
      },
    },
  },
})
