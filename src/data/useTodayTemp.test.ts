import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchTodayTemp } from './useTodayTemp'

describe('fetchTodayTemp', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('parses Open-Meteo current + daily', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 24.1 },
        daily: {
          temperature_2m_max: [26.3],
          temperature_2m_min: [15.0],
        },
      }),
    }))

    const r = await fetchTodayTemp()
    expect(r).toEqual({
      temp: 24.1,
      tmax: 26.3,
      tmin: 15.0,
      isLive: true,
    })
  })

  it('takes last element of daily arrays', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 20.5 },
        daily: {
          temperature_2m_max: [25.0, 26.1, 27.2],
          temperature_2m_min: [14.0, 14.5, 13.8],
        },
      }),
    }))

    const r = await fetchTodayTemp()
    expect(r).toEqual({
      temp: 20.5,
      tmax: 27.2,
      tmin: 13.8,
      isLive: true,
    })
  })

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }))

    await expect(fetchTodayTemp()).rejects.toThrow('Open-Meteo 500')
  })
})
