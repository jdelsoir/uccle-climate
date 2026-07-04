import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RecordsTally from './RecordsTally'
import type { DailyPoint } from '../types'

const d = (mmdd: string, tmax: number, tmin: number, extra: Partial<DailyPoint> = {}): DailyPoint => ({ mmdd, tmax, tmin, ...extra })

it('returns null when there are no records', () => {
  const { container } = render(<RecordsTally year={2023} days={[d('0101', 5, 1)]} onPickDay={vi.fn()} />)
  expect(container.firstChild).toBeNull()
})
it('counts highs and lows and lists highs (hottest first) by default', () => {
  const days = [d('0715', 36.4, 20, { recHi: true }), d('0824', 35.1, 19, { recHi: true }), d('0120', 2, -8, { recLo: true })]
  render(<RecordsTally year={2023} days={days} onPickDay={vi.fn()} />)
  expect(screen.getByRole('radio', { name: /2 highs/i })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /1 lows/i })).toBeInTheDocument()
  const rows = screen.getAllByRole('button').filter(b => /Open this day/.test(b.getAttribute('aria-label') || ''))
  expect(rows[0].getAttribute('aria-label')).toMatch(/36\.4/)   // hottest record first
})
it('clicking a high row opens that day', () => {
  const onPickDay = vi.fn()
  render(<RecordsTally year={2023} days={[d('0715', 36.4, 20, { recHi: true })]} onPickDay={onPickDay} />)
  fireEvent.click(screen.getByRole('button', { name: /15 July 2023.*Open this day/i }))
  expect(onPickDay).toHaveBeenCalledWith('2023-07-15')
})
it('toggling to lows shows the low list', () => {
  const days = [d('0715', 36.4, 20, { recHi: true }), d('0120', 2, -8, { recLo: true })]
  render(<RecordsTally year={2023} days={days} onPickDay={vi.fn()} />)
  fireEvent.click(screen.getByRole('radio', { name: /1 lows/i }))
  expect(screen.getByRole('button', { name: /20 January 2023.*record low/i })).toBeInTheDocument()
})
