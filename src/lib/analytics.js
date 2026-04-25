// ── PostHog Analytics ──────────────────────────────────────────────────────
// Lazy-loaded so the app never crashes if posthog-js isn't installed yet.
// To activate: npm install posthog-js, then add VITE_POSTHOG_KEY to .env
//
// Events tracked:
//   scan_started          — user submits a photo
//   scan_completed        — AI returned a result (score, counts, cached)
//   scan_error            — analysis failed (with reason)
//   scan_limit_reached    — free tier limit hit (source: 'client' | 'server')
//   onboarding_completed  — user finishes onboarding
//   waitlist_submitted    — user joins waitlist on limit screen

let _ph = null;

export async function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  // Skip in dev or if key not set
  if (!key || import.meta.env.DEV) return;
  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(key, {
      api_host: 'https://us.i.posthog.com',
      capture_pageview: true,   // auto page_view on load
      autocapture: false,       // manual events only — keeps data clean
      persistence: 'localStorage',
      loaded: (ph) => {
        // Don't capture PII — only anonymous usage data
        ph.register({ app: 'ingrediscan', platform: 'web' });
      },
    });
    _ph = posthog;
  } catch {
    // posthog-js not installed — analytics silently disabled, app unaffected
  }
}

export function track(event, props = {}) {
  _ph?.capture(event, props);
}
