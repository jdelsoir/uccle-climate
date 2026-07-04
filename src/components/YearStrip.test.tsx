import { it, expect } from 'vitest'
import { render } from '@testing-library/react'
import YearStrip from './YearStrip'
import type { DailyPoint } from '../types'
import { anomalyColor } from '../lib/colorScale'

const d = (mmdd: string, tmax: number, tmin: number): DailyPoint => ({ mmdd, tmax, tmin })

it('renders one rect per day', () => {
  const { container } = render(<YearStrip year={2020} days={[d('0101', 5, 1), d('0102', 6, 2)]} normalFor={() => 3} />)
  expect(container.querySelectorAll('rect')).toHaveLength(2)
})
it('colors a hot day with the warm-anomaly ramp color', () => {
  const { container } = render(<YearStrip year={2020} days={[d('0701', 30, 20)]} normalFor={() => 18} />)
  expect(container.querySelector('rect')!.getAttribute('fill')).toBe(anomalyColor((30 + 20) / 2 - 18))
})
it('uses a neutral fill when the normal is missing', () => {
  const { container } = render(<YearStrip year={2020} days={[d('0101', 5, 1)]} normalFor={() => null} />)
  expect(container.querySelector('rect')!.getAttribute('fill')).toBe('var(--surface-2)')
})
it('renders nothing for an empty year', () => {
  const { container } = render(<YearStrip year={2020} days={[]} normalFor={() => 3} />)
  expect(container.querySelector('svg')).toBeNull()
})
it('positions each bar by its day-of-year across the full year (not by array index)', () => {
  // July 2 in a non-leap year is day-of-year 183 → x ≈ (183-1)/365*100 ≈ 49.86 (mid-strip),
  // even though it is the only (index-0) day in the array.
  const { container } = render(<YearStrip year={2023} days={[d('0702', 25, 15)]} normalFor={() => 18} />)
  const rect = container.querySelector('rect')!
  expect(Number(rect.getAttribute('x'))).toBeCloseTo(49.86, 1)
  expect(Number(rect.getAttribute('width'))).toBeCloseTo(100 / 365 + 0.3, 2)
})
it('leaves the rest of the strip empty for a partial (unfinished) year', () => {
  // only the first two days of 2023 elapsed → bars must occupy the far left, not stretch to 100
  const { container } = render(<YearStrip year={2023} days={[d('0101', 5, 1), d('0102', 6, 2)]} normalFor={() => 3} />)
  const rects = [...container.querySelectorAll('rect')]
  const rightEdge = Math.max(...rects.map(r => Number(r.getAttribute('x')) + Number(r.getAttribute('width'))))
  expect(rightEdge).toBeLessThan(2)   // ~2 days of 365, nowhere near full width (100)
})
it('accounts for leap years in day-of-year positioning', () => {
  // July 2 in a leap year is day 184 → x = (184-1)/366*100 = 50.0
  const { container } = render(<YearStrip year={2024} days={[d('0702', 25, 15)]} normalFor={() => 18} />)
  expect(Number(container.querySelector('rect')!.getAttribute('x'))).toBeCloseTo(50.0, 1)
})
