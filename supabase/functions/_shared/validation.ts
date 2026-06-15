// Pure helpers extracted from analyze-ingredients/index.ts so they're unit-testable
// outside of a Deno runtime. Keep this file framework-free — no Deno globals,
// no fetch, no crypto. Just functions with deterministic inputs/outputs.

export const ALLOWED_ORIGINS = [
  'https://ingrediscan-ai.vercel.app',
  'https://www.ingrediscan.in',
  'https://ingrediscan.in',
  'http://localhost:5173',
  'http://localhost:3000',
] as const

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MIN_BASE64_LENGTH = 100

// ── CORS ───────────────────────────────────────────────────────────────────
// Returns headers AND whether origin was allowed. Caller decides what to do
// with disallowed origins — for the analyze endpoint, we want 403 on miss
// rather than silently echoing a default origin (which masks attacks).
export function buildCorsHeaders(origin: string | null): {
  headers: Record<string, string>
  allowed: boolean
} {
  const allowed = !!origin && (ALLOWED_ORIGINS as readonly string[]).includes(origin)
  return {
    allowed,
    headers: {
      'Access-Control-Allow-Origin': allowed ? origin! : 'null',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dev-bypass',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    },
  }
}

// ── Client IP ─────────────────────────────────────────────────────────────
// cf-connecting-ip is set by Cloudflare/Supabase infra and cannot be spoofed
// by the client (unlike x-forwarded-for which is user-controlled).
export function extractClientIp(headers: {
  get(name: string): string | null
}): string {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  )
}

// ── Input validation ──────────────────────────────────────────────────────
export type ValidationError = { ok: false; status: number; error: string }
export type ValidationOk = { ok: true }

export function validateImagePayload(payload: unknown): ValidationError | ValidationOk {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, status: 400, error: 'Invalid request body.' }
  }
  const p = payload as { imageBase64?: unknown; mediaType?: unknown }

  if (typeof p.mediaType !== 'string' ||
      !(ALLOWED_MIME_TYPES as readonly string[]).includes(p.mediaType)) {
    return { ok: false, status: 400, error: 'Invalid image type.' }
  }
  if (typeof p.imageBase64 !== 'string' || p.imageBase64.length < MIN_BASE64_LENGTH) {
    return { ok: false, status: 400, error: 'Invalid image data.' }
  }
  // Base64 length → bytes: 4 chars encode 3 bytes, accounting for padding.
  const sizeInBytes = Math.floor((p.imageBase64.length * 3) / 4)
  if (sizeInBytes > MAX_IMAGE_BYTES) {
    return { ok: false, status: 400, error: 'Image too large. Maximum 5MB.' }
  }
  // Strict base64 character set — reject anything outside [A-Za-z0-9+/=].
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(p.imageBase64)) {
    return { ok: false, status: 400, error: 'Invalid image encoding.' }
  }
  return { ok: true }
}

// ── Claude response parsing ───────────────────────────────────────────────
// Claude is *supposed* to return raw JSON but sometimes wraps in fences.
// This function NEVER throws — caller must check the `ok` discriminator.
export function parseClaudeText(text: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  if (typeof text !== 'string') return { ok: false, error: 'Empty response from model.' }

  const tryParse = (s: string) => {
    try { return JSON.parse(s) } catch { return undefined }
  }

  // 1. Direct parse
  let value = tryParse(text)
  if (value !== undefined) return { ok: true, value }

  // 2. Strip markdown fences
  const fenceStripped = text.replace(/```json\n?|\n?```/g, '').trim()
  value = tryParse(fenceStripped)
  if (value !== undefined) return { ok: true, value }

  // 3. Last-ditch: extract first JSON object substring
  const match = fenceStripped.match(/\{[\s\S]*\}/)
  if (match) {
    value = tryParse(match[0])
    if (value !== undefined) return { ok: true, value }
  }

  return { ok: false, error: 'Could not parse model response.' }
}

// ── Schema validation on parsed analysis ──────────────────────────────────
// Defense against the model returning surprise shapes (or in the future,
// against cache poisoning if the same validator runs client-side).
export type AnalysisResult = {
  score: number
  score_rationale: string | null
  low_confidence_warning: string | null
  all_ingredients: string[]
  ingredients: Array<{
    name: string
    status: 'harmful' | 'moderate' | 'caution' | 'safe'
    reason: string
    concern_type: string
  }>
  // Caution-tier ingredients appearing in the last 25% of the ingredient list.
  // Present in small amounts → excluded from score. Defaults to [] for old cache rows.
  trace_ingredients: Array<{
    name: string
    status: 'caution'
    reason: string
    concern_type: string
  }>
  error?: string
}

export function validateAnalysisShape(value: unknown): { ok: true; value: AnalysisResult } | { ok: false; error: string } {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, error: 'Analysis is not an object.' }
  }
  const v = value as Record<string, unknown>

  // Normalize legacy "flagged" → "ingredients" before validating.
  if (Array.isArray(v.flagged) && !Array.isArray(v.ingredients)) {
    v.ingredients = v.flagged
    delete v.flagged
  }

  // Allow the documented "error" passthrough (e.g. "Medicine scanning not supported.")
  // — caller handles this case.
  if (typeof v.error === 'string' && v.error.length > 0) {
    return { ok: true, value: v as unknown as AnalysisResult }
  }

  if (typeof v.score !== 'number' || v.score < 0 || v.score > 10 || !Number.isFinite(v.score)) {
    return { ok: false, error: 'score must be a finite number 0–10.' }
  }
  if (!Array.isArray(v.ingredients)) {
    return { ok: false, error: 'ingredients must be an array.' }
  }
  for (const ing of v.ingredients) {
    if (typeof ing !== 'object' || ing === null) {
      return { ok: false, error: 'ingredient entry is not an object.' }
    }
    const i = ing as Record<string, unknown>
    if (typeof i.name !== 'string' || i.name.length === 0 || i.name.length > 200) {
      return { ok: false, error: 'ingredient.name invalid.' }
    }
    if (i.status !== 'harmful' && i.status !== 'moderate' && i.status !== 'caution' && i.status !== 'safe') {
      return { ok: false, error: `ingredient.status must be harmful|moderate|caution|safe, got ${i.status}.` }
    }
    if (typeof i.reason !== 'string' || i.reason.length > 500) {
      return { ok: false, error: 'ingredient.reason invalid.' }
    }
  }
  if (v.score_rationale !== null && v.score_rationale !== undefined && typeof v.score_rationale !== 'string') {
    return { ok: false, error: 'score_rationale must be string|null.' }
  }
  if (v.low_confidence_warning !== null && v.low_confidence_warning !== undefined && typeof v.low_confidence_warning !== 'string') {
    return { ok: false, error: 'low_confidence_warning must be string|null.' }
  }
  // all_ingredients is optional (old responses won't have it) — if present, must be string[].
  if (v.all_ingredients !== undefined && v.all_ingredients !== null) {
    if (!Array.isArray(v.all_ingredients)) {
      return { ok: false, error: 'all_ingredients must be an array.' }
    }
    for (const name of v.all_ingredients) {
      if (typeof name !== 'string' || name.length === 0 || name.length > 300) {
        return { ok: false, error: 'all_ingredients entry must be a non-empty string ≤300 chars.' }
      }
    }
  }
  // Normalise: guarantee all_ingredients is always an array on the result object.
  if (!Array.isArray(v.all_ingredients)) {
    v.all_ingredients = (v.ingredients as Array<{name:string}>).map(i => i.name)
  }
  // trace_ingredients is optional in older responses — default to [] if absent.
  if (v.trace_ingredients === undefined || v.trace_ingredients === null) {
    v.trace_ingredients = []
  } else if (!Array.isArray(v.trace_ingredients)) {
    return { ok: false, error: 'trace_ingredients must be an array.' }
  } else {
    for (const ing of v.trace_ingredients) {
      if (typeof ing !== 'object' || ing === null) {
        return { ok: false, error: 'trace_ingredients entry is not an object.' }
      }
      const i = ing as Record<string, unknown>
      if (typeof i.name !== 'string' || i.name.length === 0 || i.name.length > 200) {
        return { ok: false, error: 'trace_ingredients entry.name invalid.' }
      }
      if (i.status !== 'caution') {
        return { ok: false, error: `trace_ingredients entry.status must be "caution", got ${i.status}.` }
      }
      if (typeof i.reason !== 'string' || i.reason.length > 500) {
        return { ok: false, error: 'trace_ingredients entry.reason invalid.' }
      }
    }
  }
  return { ok: true, value: v as unknown as AnalysisResult }
}
