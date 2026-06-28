import { describe, test, expect } from 'vitest'
import { decadeMean, previousRecordHigh, previousRecordLow, tempColor } from './dayStats'

const series = [
  { year: 1900, tmax: 10, tmin: 0 },   // mean 5
  { year: 1905, tmax: 14, tmin: 2 },   // mean 8
  { year: 2000, tmax: 20, tmin: 8 },   // mean 14
  { year: 2005, tmax: 22, tmin: 10 },  // mean 16
]

test('decadeMean averages (tmax+tmin)/2 within window, null when empty', () => {
  expect(decadeMean(series, 1900, 1905)).toBe(6.5)   // (5+8)/2
  expect(decadeMean(series, 1700, 1800)).toBeNull()
})
test('previousRecordHigh = max tmax among years before the given year', () => {
  expect(previousRecordHigh(series, 2005)).toEqual({ v: 20, year: 2000 })
  expect(previousRecordHigh(series, 1900)).toBeNull()
})
test('previousRecordLow = min tmin among years before the given year', () => {
  expect(previousRecordLow(series, 2005)).toEqual({ v: 0, year: 1900 })
  expect(previousRecordLow(series, 1900)).toBeNull()
})
test('tempColor thresholds vs normal ±2', () => {
  expect(tempColor(20, 15)).toBe('text-warm')   // +5
  expect(tempColor(10, 15)).toBe('text-accent') // -5
  expect(tempColor(16, 15)).toBe('text-fg')     // +1
  expect(tempColor(null, 15)).toBe('text-fg')
  expect(tempColor(20, null)).toBe('text-fg')
})
