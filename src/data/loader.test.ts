import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadJSON } from './loader'

describe('loadJSON', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('prefixes BASE_URL and parses JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) })
    vi.stubGlobal('fetch', fetchMock)
    const r = await loadJSON<{ a: number }>('data/summary.json')
    expect(r.a).toBe(1)
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/summary.json`)
  })
  it('throws on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(loadJSON('data/x.json')).rejects.toThrow('404')
  })
})
