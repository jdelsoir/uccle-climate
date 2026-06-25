import { describe, it, expect } from 'vitest'
import { mmddOf, todayMMDD, fmtTemp, fmtDate, fmtMonth, fmtDayLabel, todayISO, ordinal } from './format'

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

describe('fmtDate', () => {
  it('formats an ISO date as D Mon YYYY (TZ-safe)', () => {
    expect(fmtDate('1947-06-25')).toBe('25 Jun 1947')
    expect(fmtDate('1926-01-03')).toBe('3 Jan 1926')
  })
})

describe('fmtMonth/fmtDayLabel', () => {
  it('formats month and day labels', () => {
    expect(fmtMonth('06')).toBe('June')
    expect(fmtMonth('01')).toBe('January')
    expect(fmtDayLabel('0626')).toBe('26 June')
    expect(fmtDayLabel('0103')).toBe('3 January')
  })
})

describe('todayISO', () => {
  it('returns local YYYY-MM-DD matching the local date', () => {
    const d = new Date()
    const exp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    expect(todayISO()).toBe(exp)
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('ordinal', () => {
  it('appends correct suffix', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(22)).toBe('22nd')
  })
})
