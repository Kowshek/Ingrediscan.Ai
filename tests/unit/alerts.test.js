import { describe, it, expect, vi } from 'vitest'
import {
  ALERT_THRESHOLDS,
  DAILY_SCAN_CAP,
  SPIKE_ALERTS,
  bumpMetric,
  claimAlert,
  detectSpike,
  detectThresholdCrossing,
  fireAlert,
  sendAlertEmail,
} from '../../supabase/functions/_shared/alerts.ts'

// ── detectThresholdCrossing — pure ──────────────────────────────────────────
describe('detectThresholdCrossing', () => {
  it('returns null when nothing was crossed', () => {
    const result = detectThresholdCrossing({ oldCount: 100, newCount: 101 }, 1000)
    expect(result).toBeNull()
  })

  it('detects exactly the crossing of 70% (700 of 1000)', () => {
    const result = detectThresholdCrossing({ oldCount: 699, newCount: 700 }, 1000)
    expect(result?.key).toBe('daily_70')
  })

  it('detects 90% crossing', () => {
    const result = detectThresholdCrossing({ oldCount: 899, newCount: 900 }, 1000)
    expect(result?.key).toBe('daily_90')
  })

  it('detects 100% crossing', () => {
    const result = detectThresholdCrossing({ oldCount: 999, newCount: 1000 }, 1000)
    expect(result?.key).toBe('daily_100')
  })

  it('does NOT re-fire after the threshold has already been passed', () => {
    // We were at 700, jumped to 701 — the 70% line was crossed yesterday/earlier.
    const result = detectThresholdCrossing({ oldCount: 700, newCount: 701 }, 1000)
    expect(result).toBeNull()
  })

  it('returns the FIRST crossed threshold when multiple cross in one bump', () => {
    // Pathological: a single bump that jumps from 0 to 1000. The 70% threshold
    // is the lowest crossed and should win — the others will fire on later
    // bumps but at least the first alert goes out.
    const result = detectThresholdCrossing({ oldCount: 0, newCount: 1000 }, 1000)
    expect(result?.key).toBe('daily_70')
  })

  it('handles a tiny cap correctly (rounding)', () => {
    // cap=10, 70% = 7. oldCount=6, newCount=7 should fire.
    const result = detectThresholdCrossing({ oldCount: 6, newCount: 7 }, 10)
    expect(result?.key).toBe('daily_70')
  })

  it('uses the configured DAILY_SCAN_CAP correctly', () => {
    expect(DAILY_SCAN_CAP).toBe(1000)
    expect(ALERT_THRESHOLDS).toHaveLength(3)
  })
})

// ── detectSpike — pure ──────────────────────────────────────────────────────
describe('detectSpike', () => {
  it('returns true when the bump just crossed the threshold', () => {
    expect(
      detectSpike({ oldCount: 49, newCount: 50 }, SPIKE_ALERTS.claude_429),
    ).toBe(true)
  })

  it('returns false BEFORE crossing', () => {
    expect(
      detectSpike({ oldCount: 48, newCount: 49 }, SPIKE_ALERTS.claude_429),
    ).toBe(false)
  })

  it('returns false AFTER crossing — no re-fire', () => {
    expect(
      detectSpike({ oldCount: 50, newCount: 51 }, SPIKE_ALERTS.claude_429),
    ).toBe(false)
  })

  it('respects per-alert thresholds', () => {
    // rate_limit_blocks fires at 100, not 50.
    expect(
      detectSpike({ oldCount: 49, newCount: 50 }, SPIKE_ALERTS.rate_limit_blocks),
    ).toBe(false)
    expect(
      detectSpike({ oldCount: 99, newCount: 100 }, SPIKE_ALERTS.rate_limit_blocks),
    ).toBe(true)
  })
})

// ── bumpMetric — RPC wrapper ────────────────────────────────────────────────
describe('bumpMetric', () => {
  it('returns parsed counts on success', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ new_count: 42, old_count: 41 }],
        error: null,
      }),
    }
    const result = await bumpMetric(client, 'scans_attempted')
    expect(client.rpc).toHaveBeenCalledWith('bump_usage_metric', {
      p_metric: 'scans_attempted',
      p_amount: 1,
    })
    expect(result).toEqual({ newCount: 42, oldCount: 41 })
  })

  it('returns null on RPC error and does NOT throw', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'connection refused' },
      }),
    }
    const result = await bumpMetric(client, 'scans_attempted')
    expect(result).toBeNull()
  })

  it('returns null when the RPC returns no rows', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const result = await bumpMetric(client, 'whatever')
    expect(result).toBeNull()
  })

  it('passes a custom amount through', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ new_count: 10, old_count: 5 }],
        error: null,
      }),
    }
    await bumpMetric(client, 'scans', 5)
    expect(client.rpc).toHaveBeenCalledWith('bump_usage_metric', {
      p_metric: 'scans',
      p_amount: 5,
    })
  })
})

// ── claimAlert — RPC wrapper ────────────────────────────────────────────────
describe('claimAlert', () => {
  it('returns true when the RPC returns true', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    }
    expect(await claimAlert(client, 'daily_70')).toBe(true)
  })

  it('returns false on subsequent calls (already claimed)', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    }
    expect(await claimAlert(client, 'daily_70')).toBe(false)
  })

  it('returns false on RPC error — fails closed (no email)', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'fail' },
      }),
    }
    expect(await claimAlert(client, 'daily_70')).toBe(false)
  })
})

// ── sendAlertEmail — Resend transport ───────────────────────────────────────
describe('sendAlertEmail', () => {
  it('POSTs to Resend with auth header and JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    })
    const result = await sendAlertEmail(
      {
        apiKey: 'rk_test',
        to: 'ops@x.com',
        from: 'alerts@x.com',
        fetch: fetchMock,
      },
      'subject here',
      'body here',
    )
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer rk_test',
          'Content-Type': 'application/json',
        }),
      }),
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toEqual({
      from: 'alerts@x.com',
      to: ['ops@x.com'],
      subject: 'subject here',
      text: 'body here',
    })
  })

  it('returns ok=false on a non-2xx response and includes the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => '{"error":"invalid_from"}',
    })
    const result = await sendAlertEmail(
      { apiKey: 'k', to: 'a@b.c', from: 'c@d.e', fetch: fetchMock },
      's',
      'b',
    )
    expect(result.ok).toBe(false)
    expect(result.error).toContain('422')
    expect(result.error).toContain('invalid_from')
  })

  it('returns ok=false when fetch throws and does NOT propagate', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    const result = await sendAlertEmail(
      { apiKey: 'k', to: 'a@b.c', from: 'c@d.e', fetch: fetchMock },
      's',
      'b',
    )
    expect(result.ok).toBe(false)
    expect(result.error).toBe('network down')
  })
})

// ── fireAlert — wrapper, NEVER throws ───────────────────────────────────────
describe('fireAlert', () => {
  it('does nothing when the alert was already claimed today', async () => {
    const fetchMock = vi.fn()
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }), // claimAlert → false
    }
    await fireAlert(
      client,
      { apiKey: 'k', to: 'a@b.c', from: 'c@d.e', fetch: fetchMock },
      { key: 'daily_70', subject: 's' },
      'body',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('skips the email when Resend env vars are missing', async () => {
    const fetchMock = vi.fn()
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    }
    await fireAlert(
      client,
      { apiKey: undefined, to: undefined, from: undefined, fetch: fetchMock },
      { key: 'daily_70', subject: 's' },
      'body',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the email when claimed and config is present', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    })
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    }
    await fireAlert(
      client,
      { apiKey: 'k', to: 'a@b.c', from: 'c@d.e', fetch: fetchMock },
      { key: 'daily_70', subject: 'subj' },
      'body',
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does NOT throw when claimAlert blows up', async () => {
    const client = {
      rpc: vi.fn().mockRejectedValue(new Error('db dead')),
    }
    await expect(
      fireAlert(
        client,
        { apiKey: 'k', to: 'a@b.c', from: 'c@d.e' },
        { key: 'k', subject: 's' },
        'b',
      ),
    ).resolves.toBeUndefined()
  })
})
