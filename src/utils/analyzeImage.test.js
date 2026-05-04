import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase BEFORE importing the unit under test.
// We model the chained query builder so the test mirrors real usage.
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockInsert = vi.fn(() => ({ then: (cb) => cb({ error: null }) }))
const mockUpdateThen = vi.fn((cb) => cb({ error: null }))
const mockUpdateEq = vi.fn(() => ({ then: mockUpdateThen }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}))

vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

// Hash is deterministic-ish but we stub it to keep tests focused.
vi.mock('../lib/hash', () => ({
  hashIngredients: vi.fn(async () => 'deadbeef'.repeat(8)),
  hashImage: vi.fn(async () => 'deadbeef'.repeat(8)),
}))

import { analyzeIngredients } from './analyzeImage'

function makeImageFile() {
  // FileReader in jsdom reads a real Blob — give it ~100 bytes of fake JPEG.
  const bytes = new Uint8Array(128).fill(0x55)
  return new File([bytes], 'label.jpg', { type: 'image/jpeg' })
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

describe('analyzeIngredients — cache path', () => {
  it('returns cached result without calling the Edge Function on a hit', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        flagged: {
          score: 8,
          ingredients: [{ name: 'Sugar', status: 'moderate', reason: 'x', concern_type: 'frequent_use_concern' }],
          score_rationale: 'mostly clean',
        },
        scan_count: 3,
      },
    })

    const result = await analyzeIngredients(makeImageFile())

    expect(result.score).toBe(8)
    expect(result.ingredients[0].name).toBe('Sugar')
    expect(global.fetch).not.toHaveBeenCalled()
    // Cache-hit path bumps scan_count
    expect(mockUpdate).toHaveBeenCalledWith({ scan_count: 4 })
  })

  it('normalizes legacy cache shape that uses "flagged" instead of "ingredients"', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        flagged: {
          score: 4,
          // Legacy shape — nested "flagged" key
          flagged: [{ name: 'TBHQ', status: 'harmful', reason: 'carcinogen risk' }],
        },
        scan_count: 1,
      },
    })

    const result = await analyzeIngredients(makeImageFile())

    expect(Array.isArray(result.ingredients)).toBe(true)
    expect(result.ingredients[0].name).toBe('TBHQ')
    expect(result.flagged).toBeUndefined()
  })
})

describe('analyzeIngredients — cache miss → Edge Function', () => {
  it('calls Edge Function and persists fresh result on cache miss', async () => {
    mockSingle.mockResolvedValueOnce({ data: null })

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        score: 6,
        score_rationale: 'a few moderate',
        ingredients: [{ name: 'Palm oil', status: 'moderate', reason: 'cv risk', concern_type: 'frequent_use_concern' }],
      }),
    })

    const result = await analyzeIngredients(makeImageFile())

    expect(result.score).toBe(6)
    expect(global.fetch).toHaveBeenCalledOnce()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toContain('/functions/v1/analyze-ingredients')
    expect(opts.method).toBe('POST')
    expect(opts.headers.Authorization).toMatch(/^Bearer /)
  })

  it('throws a user-friendly error when Edge Function returns non-OK', async () => {
    mockSingle.mockResolvedValueOnce({ data: null })
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Too many requests. Please wait a moment.' }),
    })

    await expect(analyzeIngredients(makeImageFile())).rejects.toThrow(/Too many requests/)
  })

  it('throws when Edge Function returns malformed payload (no score)', async () => {
    mockSingle.mockResolvedValueOnce({ data: null })
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ingredients: [] }), // missing score
    })

    await expect(analyzeIngredients(makeImageFile())).rejects.toThrow(/Incomplete analysis/)
  })

  it('throws when Edge Function returns embedded error key', async () => {
    mockSingle.mockResolvedValueOnce({ data: null })
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Medicine scanning not supported.' }),
    })

    await expect(analyzeIngredients(makeImageFile())).rejects.toThrow(/Medicine scanning/)
  })
})
