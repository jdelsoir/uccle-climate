import { renderHook, waitFor } from '@testing-library/react'
import { vi, afterEach, it, expect } from 'vitest'
import { useYear } from './useYear'
import type { YearData } from '../types'

afterEach(() => vi.unstubAllGlobals())

it('loads the year months array for the given year', async () => {
  const months: YearData = [{ mm: '06', mean: 20, normal: 18, complete: true, recHi: true }]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => months }))
  const { result } = renderHook(() => useYear(2020))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.data).toEqual(months)
  expect(result.current.error).toBeNull()
})
