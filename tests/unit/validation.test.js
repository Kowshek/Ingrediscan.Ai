import { describe, it, expect } from 'vitest'
import {
  buildCorsHeaders,
  extractClientIp,
  parseClaudeText,
  validateAnalysisShape,
  validateImagePayload,
  ALLOWED_ORIGINS,
} from '../../supabase/functions/_shared/validation.ts'

// ── CORS ───────────────────────────────────────────────────────────────────
describe('buildCorsHeaders', () => {
  it('echoes a known origin verbatim', () => {
    const out = buildCorsHeaders('https://ingrediscan.in')
    expect(out.allowed).toBe(true)
    expect(out.headers['Access-Control-Allow-Origin']).toBe('https://ingrediscan.in')
  })

  it('does NOT silently fall back to a default origin for unknown origins', () => {
    const out = buildCorsHeaders('https://evil.example.com')
    expect(out.allowed).toBe(false)
    // The previous implementation echoed ALLOWED_ORIGINS[0] here. We now
    // return "null" so the browser refuses the request.
    expect(out.headers['Access-Control-Allow-Origin']).toBe('null')
    expect(out.headers['Access-Control-Allow-Origin']).not.toBe(ALLOWED_ORIGINS[0])
  })

  it('handles missing Origin header', () => {
    const out = buildCorsHeaders(null)
    expect(out.allowed).toBe(false)
  })

  it('always sets Vary: Origin to prevent CDN cache bleed', () => {
    expect(buildCorsHeaders('https://ingrediscan.in').headers.Vary).toBe('Origin')
    expect(buildCorsHeaders('https://evil.example.com').headers.Vary).toBe('Origin')
  })
})

// ── Client IP extraction ──────────────────────────────────────────────────
describe('extractClientIp', () => {
  function headers(map) {
    return { get: (name) => map[name.toLowerCase()] ?? null }
  }

  it('prefers cf-connecting-ip (un-spoofable by client)', () => {
    const h = headers({
      'cf-connecting-ip': '203.0.113.1',
      'x-forwarded-for': '198.51.100.99', // attacker tries to spoof
    })
    expect(extractClientIp(h)).toBe('203.0.113.1')
  })

  it('falls back to x-real-ip when cf header is absent', () => {
    const h = headers({ 'x-real-ip': '203.0.113.7' })
    expect(extractClientIp(h)).toBe('203.0.113.7')
  })

  it('takes the first entry from x-forwarded-for chain', () => {
    const h = headers({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1, 10.0.0.2' })
    expect(extractClientIp(h)).toBe('203.0.113.1')
  })

  it('returns "unknown" when no IP headers present', () => {
    expect(extractClientIp(headers({}))).toBe('unknown')
  })
})

// ── Image payload validation ──────────────────────────────────────────────
describe('validateImagePayload', () => {
  const validBase64 = 'a'.repeat(200) // 150 bytes when decoded — well under 5MB

  it('accepts a valid jpeg payload', () => {
    expect(validateImagePayload({ imageBase64: validBase64, mediaType: 'image/jpeg' }))
      .toEqual({ ok: true })
  })

  it('rejects unsupported mime types', () => {
    const out = validateImagePayload({ imageBase64: validBase64, mediaType: 'image/gif' })
    expect(out).toMatchObject({ ok: false, status: 400, error: /Invalid image type/ })
  })

  it('rejects arbitrary file types disguised as images', () => {
    const out = validateImagePayload({ imageBase64: validBase64, mediaType: 'application/javascript' })
    expect(out.ok).toBe(false)
  })

  it('rejects payloads that are too large', () => {
    const big = 'a'.repeat(7 * 1024 * 1024) // ~5.25MB once decoded
    const out = validateImagePayload({ imageBase64: big, mediaType: 'image/jpeg' })
    expect(out).toMatchObject({ ok: false, error: /too large/ })
  })

  it('rejects payloads that are too small (likely empty / probe)', () => {
    const out = validateImagePayload({ imageBase64: 'abc', mediaType: 'image/jpeg' })
    expect(out).toMatchObject({ ok: false, error: /Invalid image data/ })
  })

  it('rejects non-base64 characters in payload', () => {
    const bad = '<<<!!!' + 'a'.repeat(200)
    const out = validateImagePayload({ imageBase64: bad, mediaType: 'image/jpeg' })
    expect(out).toMatchObject({ ok: false, error: /encoding/ })
  })

  it('rejects null payload', () => {
    expect(validateImagePayload(null).ok).toBe(false)
  })

  it('rejects payload with missing imageBase64', () => {
    expect(validateImagePayload({ mediaType: 'image/jpeg' }).ok).toBe(false)
  })
})

// ── Claude response parsing ───────────────────────────────────────────────
describe('parseClaudeText', () => {
  it('parses raw JSON', () => {
    const out = parseClaudeText('{"score":7,"ingredients":[]}')
    expect(out.ok).toBe(true)
    expect(out.value).toEqual({ score: 7, ingredients: [] })
  })

  it('parses fenced markdown JSON', () => {
    const out = parseClaudeText('```json\n{"score":7,"ingredients":[]}\n```')
    expect(out.ok).toBe(true)
    expect(out.value.score).toBe(7)
  })

  it('extracts JSON from prose preamble', () => {
    const out = parseClaudeText('Sure! Here you go:\n\n{"score":3,"ingredients":[]}')
    expect(out.ok).toBe(true)
    expect(out.value.score).toBe(3)
  })

  it('returns ok:false on garbage input — never throws', () => {
    const out = parseClaudeText('not json at all')
    expect(out.ok).toBe(false)
  })

  it('returns ok:false on non-string input', () => {
    expect(parseClaudeText(undefined).ok).toBe(false)
    expect(parseClaudeText(null).ok).toBe(false)
    expect(parseClaudeText(42).ok).toBe(false)
  })
})

// ── Analysis schema validation ────────────────────────────────────────────
describe('validateAnalysisShape', () => {
  const baseValid = {
    score: 6,
    score_rationale: 'a few moderate ingredients',
    low_confidence_warning: null,
    ingredients: [
      { name: 'TBHQ', status: 'harmful', reason: 'carcinogen risk', concern_type: 'carcinogen' },
    ],
  }

  it('accepts a well-formed analysis', () => {
    expect(validateAnalysisShape(baseValid).ok).toBe(true)
  })

  it('accepts the documented "error" passthrough (medicine, unreadable)', () => {
    const out = validateAnalysisShape({ score: 0, ingredients: [], error: 'Medicine scanning not supported.' })
    expect(out.ok).toBe(true)
  })

  it('rejects score outside 0–10', () => {
    expect(validateAnalysisShape({ ...baseValid, score: 11 }).ok).toBe(false)
    expect(validateAnalysisShape({ ...baseValid, score: -1 }).ok).toBe(false)
    expect(validateAnalysisShape({ ...baseValid, score: NaN }).ok).toBe(false)
    expect(validateAnalysisShape({ ...baseValid, score: Infinity }).ok).toBe(false)
  })

  it('rejects bogus ingredient.status (defense vs prompt-injected output)', () => {
    const bad = { ...baseValid, ingredients: [{ ...baseValid.ingredients[0], status: 'harmless' }] }
    expect(validateAnalysisShape(bad).ok).toBe(false)
  })

  it('rejects ingredient.name that is suspiciously long (XSS / DOS vector)', () => {
    const bad = { ...baseValid, ingredients: [{ ...baseValid.ingredients[0], name: 'a'.repeat(500) }] }
    expect(validateAnalysisShape(bad).ok).toBe(false)
  })

  it('normalizes legacy "flagged" key to "ingredients"', () => {
    const legacy = { score: 5, flagged: baseValid.ingredients }
    const out = validateAnalysisShape(legacy)
    expect(out.ok).toBe(true)
    expect(Array.isArray(out.value.ingredients)).toBe(true)
  })

  it('rejects null and primitives', () => {
    expect(validateAnalysisShape(null).ok).toBe(false)
    expect(validateAnalysisShape('hello').ok).toBe(false)
    expect(validateAnalysisShape(42).ok).toBe(false)
  })

  // ── all_ingredients ───────────────────────────────────────────────────────
  it('accepts and passes through a valid all_ingredients array', () => {
    const out = validateAnalysisShape({ ...baseValid, all_ingredients: ['Sugar', 'Salt'] })
    expect(out.ok).toBe(true)
    expect(out.value.all_ingredients).toEqual(['Sugar', 'Salt'])
  })

  it('rejects all_ingredients that is not an array', () => {
    const out = validateAnalysisShape({ ...baseValid, all_ingredients: 'Sugar, Salt' })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/all_ingredients must be an array/)
  })

  it('rejects all_ingredients entries that are empty or too long', () => {
    expect(validateAnalysisShape({ ...baseValid, all_ingredients: [''] }).ok).toBe(false)
    expect(validateAnalysisShape({ ...baseValid, all_ingredients: ['a'.repeat(301)] }).ok).toBe(false)
  })

  it('normalises missing all_ingredients to a derived list from ingredients[]', () => {
    const out = validateAnalysisShape(baseValid)
    expect(out.ok).toBe(true)
    expect(out.value.all_ingredients).toEqual(['TBHQ'])
  })

  // ── trace_ingredients ─────────────────────────────────────────────────────
  it('defaults trace_ingredients to [] when field is absent', () => {
    const out = validateAnalysisShape(baseValid)
    expect(out.ok).toBe(true)
    expect(out.value.trace_ingredients).toEqual([])
  })

  it('defaults trace_ingredients to [] when field is null', () => {
    const out = validateAnalysisShape({ ...baseValid, trace_ingredients: null })
    expect(out.ok).toBe(true)
    expect(out.value.trace_ingredients).toEqual([])
  })

  it('accepts a valid trace_ingredients array', () => {
    const trace = [{ name: 'Salt', status: 'caution', reason: 'small amount', concern_type: 'frequent_use_concern' }]
    const out = validateAnalysisShape({ ...baseValid, trace_ingredients: trace })
    expect(out.ok).toBe(true)
    expect(out.value.trace_ingredients).toHaveLength(1)
    expect(out.value.trace_ingredients[0].name).toBe('Salt')
  })

  it('accepts an empty trace_ingredients array', () => {
    const out = validateAnalysisShape({ ...baseValid, trace_ingredients: [] })
    expect(out.ok).toBe(true)
    expect(out.value.trace_ingredients).toEqual([])
  })

  it('rejects trace_ingredients that is not an array', () => {
    const out = validateAnalysisShape({ ...baseValid, trace_ingredients: 'Salt' })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/trace_ingredients must be an array/)
  })

  it('rejects trace_ingredients entry that is not an object', () => {
    const out = validateAnalysisShape({ ...baseValid, trace_ingredients: ['Salt'] })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/not an object/)
  })

  it('rejects trace_ingredients entry with missing or oversized name', () => {
    const base = { status: 'caution', reason: 'x', concern_type: 'frequent_use_concern' }
    expect(validateAnalysisShape({ ...baseValid, trace_ingredients: [{ ...base, name: '' }] }).ok).toBe(false)
    expect(validateAnalysisShape({ ...baseValid, trace_ingredients: [{ ...base, name: 'a'.repeat(201) }] }).ok).toBe(false)
  })

  it('rejects trace_ingredients entry whose status is not "caution"', () => {
    const bad = { name: 'TBHQ', status: 'harmful', reason: 'x', concern_type: 'carcinogen' }
    const out = validateAnalysisShape({ ...baseValid, trace_ingredients: [bad] })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/must be "caution"/)
  })

  it('rejects trace_ingredients entry with an oversized reason string', () => {
    const bad = { name: 'Salt', status: 'caution', reason: 'x'.repeat(501), concern_type: 'frequent_use_concern' }
    const out = validateAnalysisShape({ ...baseValid, trace_ingredients: [bad] })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/reason invalid/)
  })
})
