// ── Consent management ────────────────────────────────────────────────────────
// Stores the user's analytics consent decision in localStorage.
// Three states:
//   null        — no decision yet (show the banner)
//   'granted'   — user accepted (init PostHog + Sentry replays)
//   'denied'    — user declined (analytics stay off for this session and future ones)

const CONSENT_KEY = 'ingrediscan_analytics_consent'

export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) // 'granted' | 'denied' | null
  } catch {
    return null
  }
}

export function giveConsent() {
  try { localStorage.setItem(CONSENT_KEY, 'granted') } catch { /* */ }
}

export function denyConsent() {
  try { localStorage.setItem(CONSENT_KEY, 'denied') } catch { /* */ }
}

export function hasDecided() {
  const v = getConsent()
  return v === 'granted' || v === 'denied'
}

export function hasGranted() {
  return getConsent() === 'granted'
}
