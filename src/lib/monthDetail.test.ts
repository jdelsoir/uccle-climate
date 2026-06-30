import { describe, it, expect } from 'vitest'
import { monthDays, dayMix, recordsBroken, topWarmest, topColdest, windowMean } from './monthDetail'
import type { DailyPoint } from '../types'

const d = (mmdd: string, tmax: number, tmin: number, extra: Partial<DailyPoint> = {}): DailyPoint => ({ mmdd, tmax, tmin, ...extra })

describe('monthDays', () => {
  it('filters to the month by mmdd prefix', () => {
    const all = [d('0601', 20, 10), d('0701', 25, 12), d('0630', 22, 11)]
    expect(monthDays(all, '06').map(x => x.mmdd)).toEqual(['0601', '0630'])
  })
})

describe('dayMix', () => {
  it('classifies via tempColor ±2 against the per-day normal', () => {
    const normal = (_: string) => 20            // warm if tmax>22, cool if tmax<18
    const days = [d('0601', 25, 10), d('0602', 15, 5), d('0603', 20, 8)]
    expect(dayMix(days, normal)).toEqual({ warm: 1, cool: 1, neutral: 1, total: 3 })
  })
  it('treats a missing normal as neutral', () => {
    expect(dayMix([d('0601', 40, 10)], () => null)).toEqual({ warm: 0, cool: 0, neutral: 1, total: 1 })
  })
})

describe('recordsBroken', () => {
  it('counts recHi and recLo flags', () => {
    expect(recordsBroken([d('0601', 30, 9, { recHi: true }), d('0602', 5, -2, { recLo: true }), d('0603', 20, 10, { recHi: true, recLo: true })])).toBe(4)
  })
})

describe('topWarmest / topColdest', () => {
  const days = [d('0601', 30, 9), d('0602', 22, 4), d('0603', 27, 12), d('0604', 19, -1)]
  it('warmest sorts by tmax desc', () => {
    expect(topWarmest(days, 2).map(x => x.mmdd)).toEqual(['0601', '0603'])
  })
  it('coldest sorts by tmin asc', () => {
    expect(topColdest(days, 2).map(x => x.mmdd)).toEqual(['0604', '0602'])
  })
})

describe('windowMean', () => {
  const series = [
    { year: 1918, mean: 14, complete: true },
    { year: 1922, mean: 16, complete: true },
    { year: 1950, mean: 99, complete: false },   // incomplete → excluded
    { year: 2020, mean: 18, complete: true },
  ]
  it('averages complete years inside the window, rounded to 1 decimal', () => {
    expect(windowMean(series, 1915, 1925)).toBe(15)     // (14+16)/2
  })
  it('excludes incomplete years', () => {
    expect(windowMean(series, 1949, 1951)).toBeNull()   // only the incomplete 1950 is in range
  })
  it('returns null when no complete year falls in the window', () => {
    expect(windowMean(series, 1700, 1800)).toBeNull()
  })
})
