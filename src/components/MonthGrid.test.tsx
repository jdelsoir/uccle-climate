import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MonthGrid from './MonthGrid'
import type { YearMonth } from '../types'

const mo = (mm: string, mean: number, normal: number, extra: Partial<YearMonth> = {}): YearMonth =>
  ({ mm, mean, normal, complete: true, ...extra })

it('renders 12 gridcells; months absent from data are inert (not buttons)', () => {
  render(<MonthGrid year={2020} months={[mo('06', 20, 18)]} onPickMonth={vi.fn()} />)
  const cells = screen.getAllByRole('gridcell')
  expect(cells).toHaveLength(12)
  const march = screen.getByRole('gridcell', { name: /March 2020 — no data/i })
  expect(march.tagName).not.toBe('BUTTON')
})

it('clicking a month tile calls onPickMonth with the month number', () => {
  const onPickMonth = vi.fn()
  render(<MonthGrid year={2020} months={[mo('06', 20, 18)]} onPickMonth={onPickMonth} />)
  fireEvent.click(screen.getByRole('gridcell', { name: /June 2020.*Open this month/i }))
  expect(onPickMonth).toHaveBeenCalledWith(2020, 6)
})

it('a record-warm month shows a warm sun glyph and names it "warmest … on record"', () => {
  render(<MonthGrid year={2020} months={[mo('07', 23.1, 18, { recHi: true })]} onPickMonth={vi.fn()} />)
  const cell = screen.getByRole('gridcell', { name: /July 2020.*warmest July on record/i })
  expect(cell.querySelector('svg.text-warm')).toBeTruthy()
  expect(cell.querySelector('svg.text-accent')).toBeNull()
})

it('a record-cold month shows a cool snowflake glyph and names it "coldest … on record"', () => {
  render(<MonthGrid year={1990} months={[mo('01', -2, 3, { recLo: true })]} onPickMonth={vi.fn()} />)
  const cell = screen.getByRole('gridcell', { name: /January 1990.*coldest January on record/i })
  expect(cell.querySelector('svg.text-accent')).toBeTruthy()
  expect(cell.querySelector('svg.text-warm')).toBeNull()
})

it('a non-record month renders no glyph', () => {
  render(<MonthGrid year={2000} months={[mo('06', 18, 18)]} onPickMonth={vi.fn()} />)
  expect(screen.getByRole('gridcell', { name: /June 2000/i }).querySelector('svg')).toBeNull()
})

it('tints a warm month warm and a cool month cool', () => {
  render(<MonthGrid year={2020} months={[mo('07', 23, 18), mo('01', 0, 4)]} onPickMonth={vi.fn()} />)
  expect(screen.getByRole('gridcell', { name: /July 2020/i }).className).toMatch(/bg-warm\/15/)
  expect(screen.getByRole('gridcell', { name: /January 2020/i }).className).toMatch(/bg-accent\/15/)
})
