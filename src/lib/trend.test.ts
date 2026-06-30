import { describe, it, expect } from 'vitest'
import { linregress, perDecade } from './trend'

describe('linregress', () => {
  it('recovers slope and intercept of an exact line y = 2x + 1', () => {
    const fit = linregress([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])
    expect(fit).not.toBeNull()
    expect(fit!.slope).toBeCloseTo(2, 10)
    expect(fit!.intercept).toBeCloseTo(1, 10)
  })
  it('fits a best-fit slope through noisy points', () => {
    const fit = linregress([{ x: 2000, y: 10 }, { x: 2010, y: 11 }, { x: 2020, y: 12 }])
    expect(fit!.slope).toBeCloseTo(0.1, 10)   // +1°C per 10 years
  })
  it('returns null for fewer than 2 points', () => {
    expect(linregress([])).toBeNull()
    expect(linregress([{ x: 1, y: 1 }])).toBeNull()
  })
  it('returns null when all x are identical (zero variance)', () => {
    expect(linregress([{ x: 5, y: 1 }, { x: 5, y: 9 }])).toBeNull()
  })
})

describe('perDecade', () => {
  it('multiplies a per-year slope by 10', () => {
    expect(perDecade(0.1)).toBeCloseTo(1, 10)
    expect(perDecade(0.018)).toBeCloseTo(0.18, 10)
  })
})
