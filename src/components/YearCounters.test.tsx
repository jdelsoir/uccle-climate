import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import YearCounters from './YearCounters'
import type { Summary } from '../types'

const cp = (pairs: [number, number][]) => pairs.map(([year, n]) => ({ year, n }))
const counters = {
  SU: cp([[1991, 10], [2020, 20], [2023, 40]]),   // normal (10+20)/2 = 15.0, 2023 count 40
  hot30: cp([[1991, 0], [2020, 2], [2023, 5]]),
  TR: cp([[2023, 0]]),                              // normal null + count 0 → hidden row
  FD: cp([[1991, 60], [2020, 40], [2023, 12]]),
  ID: cp([[1991, 4], [2020, 2], [2023, 1]]),
  heatwaveDays: cp([]), gsl: cp([]),
} as unknown as Summary['counters']

it('shows the viewed-year count and the 1991-2020 normal', () => {
  render(<YearCounters year={2023} counters={counters} incomplete={false} />)
  expect(screen.getByText('40')).toBeInTheDocument()          // SU 2023 count
  expect(screen.getByText(/normal 15\.0/)).toBeInTheDocument() // SU normal
  expect(screen.getByText(/by the numbers/)).toBeInTheDocument()
})
it('hides a counter with no normal and zero count, and says "so far" when incomplete', () => {
  render(<YearCounters year={2023} counters={counters} incomplete={true} />)
  expect(screen.queryByText('tropical nights')).toBeNull()
  expect(screen.getByText(/so far/)).toBeInTheDocument()
})
it('renders nothing when every counter is zero/absent', () => {
  const empty = { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] } as unknown as Summary['counters']
  const { container } = render(<YearCounters year={2023} counters={empty} incomplete={false} />)
  expect(container.firstChild).toBeNull()
})
