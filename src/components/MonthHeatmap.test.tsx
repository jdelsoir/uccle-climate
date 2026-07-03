import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MonthHeatmap from './MonthHeatmap'
import type { DailyPoint } from '../types'

const day = (mmdd: string, tmax: number, tmin: number, extra: Partial<DailyPoint> = {}): DailyPoint => ({ mmdd, tmax, tmin, ...extra })

it('renders a cell per day with a record dot, and clicking calls onPick with the iso date', () => {
  const onPick = vi.fn()
  const days = [day('0619', 34.1, 18, { recHi: true }), day('0620', 24, 14)]
  render(<MonthHeatmap year={2019} mm="06" days={days} normalFor={() => 20} liveToday={null} onPick={onPick} />)
  // 19th cell: accessible name includes the high and "record"
  const cell19 = screen.getByRole('gridcell', { name: /June 19, 2019.*high 34\.1.*record/i })
  fireEvent.click(cell19)
  expect(onPick).toHaveBeenCalledWith('2019-06-19')
})

it('marks days with no data as inert (no button)', () => {
  render(<MonthHeatmap year={2019} mm="06" days={[day('0601', 20, 10)]} normalFor={() => 20} liveToday={null} onPick={vi.fn()} />)
  // 02 June has no data → present as a gridcell but not clickable
  const cell2 = screen.getByRole('gridcell', { name: /June 2, 2019 — no data/i })
  expect(cell2.tagName).not.toBe('BUTTON')
})

it('renders a warm sun glyph on a record-high day and names it "record high"', () => {
  render(<MonthHeatmap year={2019} mm="06" days={[day('0619', 34.1, 18, { recHi: true })]} normalFor={() => 20} liveToday={null} onPick={vi.fn()} />)
  const cell = screen.getByRole('gridcell', { name: /June 19, 2019.*record high/i })
  expect(cell.querySelector('svg.text-warm')).toBeTruthy()
  expect(cell.querySelector('svg.text-accent')).toBeNull()
})

it('renders a cool snowflake glyph on a record-low day and names it "record low"', () => {
  render(<MonthHeatmap year={2019} mm="01" days={[day('0107', 2, -8, { recLo: true })]} normalFor={() => 3} liveToday={null} onPick={vi.fn()} />)
  const cell = screen.getByRole('gridcell', { name: /January 7, 2019.*record low/i })
  expect(cell.querySelector('svg.text-accent')).toBeTruthy()
  expect(cell.querySelector('svg.text-warm')).toBeNull()
})

it('shows the sun on a day that is both record high and low', () => {
  render(<MonthHeatmap year={2019} mm="06" days={[day('0619', 34, -1, { recHi: true, recLo: true })]} normalFor={() => 20} liveToday={null} onPick={vi.fn()} />)
  const cell = screen.getByRole('gridcell', { name: /June 19, 2019.*record high and low/i })
  expect(cell.querySelector('svg.text-warm')).toBeTruthy()
  expect(cell.querySelector('svg.text-accent')).toBeNull()
})

it('renders no glyph on a non-record day', () => {
  render(<MonthHeatmap year={2019} mm="06" days={[day('0620', 24, 14)]} normalFor={() => 20} liveToday={null} onPick={vi.fn()} />)
  const cell = screen.getByRole('gridcell', { name: /June 20, 2019/i })
  expect(cell.querySelector('svg')).toBeNull()
})
