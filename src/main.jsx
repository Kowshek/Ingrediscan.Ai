import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { hasGranted } from './lib/consent'
import { initAnalytics } from './lib/analytics'

// ── Sentry Error Monitoring ────────────────────────────────────────────────
// Sentry is split into two tiers:
//
//   Tier 1 — error tracking only (no replays, no user tracking).
//   Runs unconditionally in production. Legitimate interest basis: we need
//   to know when the app crashes. PII is stripped in beforeSend.
//
//   Tier 2 — session replays.
//   Only enabled if the user has granted analytics consent. Replays record
//   user behaviour and require explicit opt-in under GDPR.
//
// PostHog analytics — fully consent-gated, initialised only after the user
// accepts the consent banner (or on subsequent loads if already accepted).
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  const consentGranted = hasGranted()

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,

    integrations: [
      Sentry.browserTracingIntegration(),
      // Replays only if user consented
      ...(consentGranted ? [Sentry.replayIntegration()] : []),
    ],

    tracesSampleRate: 0.1,

    // Replays off until consent — after consent they activate on next page load
    replaysSessionSampleRate: consentGranted ? 0.1 : 0,
    replaysOnErrorSampleRate: consentGranted ? 1.0 : 0,

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],

    beforeSend(event) {
      // Strip PII from error context before it leaves the browser.
      if (event.user) {
        delete event.user.email
        delete event.user.ip_address
      }
      return event
    },
  })
}

// PostHog — only init if consent was already granted in a previous session.
// On first visit this is skipped; ConsentBanner calls initAnalytics() after
// the user accepts.
if (hasGranted()) {
  initAnalytics()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
