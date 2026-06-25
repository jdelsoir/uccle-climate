import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchTodayTemp } from './useTodayTemp'

describe('fetchTodayTemp', () => {
  afterEach(() => vi.unstubAllGlobals())

  it("selects today's daily row by matching current.time date", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { time: '2026-06-25T20:45', temperature_2m: 24.1 },
        daily: {
          time: ['2026-06-25', '2026-06-26', '2026-06-27'],
          temperature_2m_max: [26.3, 30.0, 31.0],
          temperature_2m_min: [15.0, 16.0, 17.0],
        },
      }),
    }))

    const r = await fetchTodayTemp()
    expect(r).toEqual({ temp: 24.1, tmax: 26.3, tmin: 15.0, isLive: true })
  })

  it('picks today even when past days precede it (not the last element)', async () => {
    // Mirrors the real API shape with past_days: today sits in the middle,
    // and the LAST row is a future forecast that must NOT be used.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { time: '2026-06-25T12:00', temperature_2m: 33.7 },
        daily: {
          time: ['2026-06-24', '2026-06-25', '2026-07-01'],
          temperature_2m_max: [37.2, 36.8, 25.6],
          temperature_2m_min: [24.0, 26.2, 15.2],
        },
      }),
    }))

    const r = await fetchTodayTemp()
    expect(r).toEqual({ temp: 33.7, tmax: 36.8, tmin: 26.2, isLive: true })
  })

  it('falls back to the first daily row when today is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { time: '2026-06-25T12:00', temperature_2m: 19.0 },
        daily: {
          temperature_2m_max: [22.0],
          temperature_2m_min: [11.0],
        },
      }),
    }))

    const r = await fetchTodayTemp()
    expect(r).toEqual({ temp: 19.0, tmax: 22.0, tmin: 11.0, isLive: true })
  })

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchTodayTemp()).rejects.toThrow('Open-Meteo 500')
  })
})
