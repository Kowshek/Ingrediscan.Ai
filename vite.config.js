import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Uploads source maps to Sentry on production builds so stack traces
    // show real file/line numbers instead of minified garbage.
    // Only active when SENTRY_AUTH_TOKEN is set (Vercel CI env var).
    // Never runs locally — doesn't slow down dev builds.
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              // Upload maps to Sentry, then delete them from the dist output
              // so they aren't publicly accessible on Vercel.
              filesToDeleteAfterUpload: ['dist/**/*.map'],
            },
            telemetry: false,
          }),
        ]
      : []),
  ],
  // Source maps are generated on every build. The Sentry plugin deletes them
  // from the dist output in production — they only exist long enough to upload.
  build: {
    sourcemap: true,
  },
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
        // Init/config files — no logic to unit test
        'src/lib/analytics.js',
        'src/lib/supabase.js',
        // Deno runtime file — not runnable in Node/jsdom
        'supabase/functions/_shared/rate-limit.ts',
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
