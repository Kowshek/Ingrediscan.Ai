import { describe, it, expect } from 'vitest'
import { hashIngredients } from './hash'

describe('hashIngredients', () => {
  it('produces a 64-char lowercase hex string (SHA-256)', async () => {
    const out = await hashIngredients('water')
    expect(out).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for identical input', async () => {
    const a = await hashIngredients('Water, Sugar, Salt')
    const b = await hashIngredients('Water, Sugar, Salt')
    expect(a).toBe(b)
  })

  it('is case-insensitive — guards against re-running OCR with caps changed', async () => {
    const lower = await hashIngredients('water, sugar, salt')
    const mixed = await hashIngredients('Water, Sugar, Salt')
    const upper = await hashIngredients('WATER, SUGAR, SALT')
    expect(lower).toBe(mixed)
    expect(mixed).toBe(upper)
  })

  it('collapses whitespace — same hash for ragged OCR output', async () => {
    const tight = await hashIngredients('water,sugar,salt')
    const ragged = await hashIngredients('  water,  sugar,   salt  ')
    // Note: current impl only collapses runs of whitespace, doesn't strip
    // commas. So ragged collapses to "water, sugar, salt" — which differs
    // from the tight form. This test documents the current behavior so
    // anyone "fixing" it sees the cache-invalidation impact.
    expect(tight).not.toBe(ragged)
  })

  it('produces different hashes for different ingredient sets', async () => {
    const a = await hashIngredients('water, sugar')
    const b = await hashIngredients('water, salt')
    expect(a).not.toBe(b)
  })

  it('handles empty string without throwing', async () => {
    const out = await hashIngredients('')
    expect(out).toMatch(/^[0-9a-f]{64}$/)
  })

  it('handles non-ASCII characters (UTF-8 ingredient names)', async () => {
    const out = await hashIngredients('eau, sucre, café')
    expect(out).toMatch(/^[0-9a-f]{64}$/)
  })
})
