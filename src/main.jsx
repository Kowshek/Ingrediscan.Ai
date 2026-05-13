import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './lib/analytics'

// ── Sentry Error Monitoring ────────────────────────────────────────────────
// Only initialises in production (when VITE_SENTRY_DSN is set).
// In dev/test, this is a no-op — no noise in your console.
// Source maps are uploaded at build time (vite.config.js → sentryVitePlugin)
// so stack traces in the Sentry dashboard show your real code, not minified js.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE, // 'production' | 'development'

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    // Capture 10% of sessions for performance tracing — enough signal without
    // hammering your Sentry quota on a free plan.
    tracesSampleRate: 0.1,

    // Session replays: 10% of normal sessions, 100% of sessions with errors.
    // Lets you watch exactly what a user did before something broke.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Ignore noisy browser extension errors that aren't your code
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],

    beforeSend(event) {
      // Strip any PII from error context before it leaves the browser.
      // Your app doesn't collect much, but this is defensive practice.
      if (event.user) {
        delete event.user.email
        delete event.user.ip_address
      }
      return event
    },
  })
}

initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
