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
