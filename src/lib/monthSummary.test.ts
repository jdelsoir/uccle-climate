import { describe, it, expect } from 'vitest'
import { monthSummary } from './monthSummary'

describe('monthSummary', () => {
  it('complete month with records', () => {
    expect(monthSummary({ warm: 12, cool: 5, total: 30, records: 2, soFar: false }))
      .toBe('12 of 30 days ran warm, 5 cool — and 2 all-time daily records fell.')
  })
  it('drops the records clause when none fell', () => {
    expect(monthSummary({ warm: 8, cool: 9, total: 28, records: 0, soFar: false }))
      .toBe('8 of 28 days ran warm, 9 cool.')
  })
  it('singular record', () => {
    expect(monthSummary({ warm: 1, cool: 0, total: 1, records: 1, soFar: false }))
      .toBe('1 of 1 day ran warm, 0 cool — and 1 all-time daily record fell.')
  })
  it('partial month says "so far"', () => {
    expect(monthSummary({ warm: 10, cool: 3, total: 18, records: 1, soFar: true }))
      .toBe('10 of 18 days so far ran warm, 3 cool — and 1 all-time daily record fell.')
  })
  it('no days yet', () => {
    expect(monthSummary({ warm: 0, cool: 0, total: 0, records: 0, soFar: true })).toBe('No days recorded yet.')
    expect(monthSummary({ warm: 0, cool: 0, total: 0, records: 0, soFar: false })).toBe('No data for this month.')
  })
})
