import { describe, it, expect } from 'vitest'
import { mmddOf, todayMMDD, fmtTemp } from './format'

describe('mmddOf', () => {
  it('zero-pads month and day', () => {
    expect(mmddOf(new Date('2026-06-25T12:00:00'))).toBe('0625')
    expect(mmddOf(new Date('2026-01-03T12:00:00'))).toBe('0103')
  })
})

describe('todayMMDD', () => {
  it('returns current date in MMDD format', () => {
    const result = todayMMDD()
    expect(result).toMatch(/^\d{4}$/)
    expect(result.length).toBe(4)
  })
})

describe('fmtTemp', () => {
  it('formats temperature with one decimal and °C', () => {
    expect(fmtTemp(24.1)).toBe('24.1 °C')
    expect(fmtTemp(15.0)).toBe('15.0 °C')
  })

  it('returns em-dash for null or undefined', () => {
    expect(fmtTemp(null)).toBe('—')
    expect(fmtTemp(undefined)).toBe('—')
  })
})
