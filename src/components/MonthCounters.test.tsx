import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MonthCounters from './MonthCounters'

const normals = { SU: 7, hot30: 1, TR: 0.4, FD: 0, ID: 0 }

it('shows only relevant counters (in-season or occurred) with the normal', () => {
  render(<MonthCounters name="June" counts={{ SU: 12, hot30: 2, TR: 1, FD: 0, ID: 0 }} normals={normals} soFar={false} />)
  expect(screen.getByText('This June by the numbers')).toBeInTheDocument()
  expect(screen.getByText('summer days')).toBeInTheDocument()
  expect(screen.getByText('tropical nights')).toBeInTheDocument()   // normal 0.4 >= ... no; but count 1 > 0 → shown
  expect(screen.queryByText('frost days')).not.toBeInTheDocument()  // normal 0, count 0 → hidden
  expect(screen.getByText(/normal 7/)).toBeInTheDocument()
})

it('surfaces an off-season counter when it actually occurred', () => {
  render(<MonthCounters name="June" counts={{ SU: 0, hot30: 0, TR: 0, FD: 2, ID: 0 }} normals={normals} soFar={false} />)
  expect(screen.getByText('frost days')).toBeInTheDocument()        // count 2 > 0 → shown despite normal 0
})

it('uses a "so far" header for an incomplete month', () => {
  render(<MonthCounters name="June" counts={{ SU: 3, hot30: 0, TR: 0, FD: 0, ID: 0 }} normals={normals} soFar={true} />)
  expect(screen.getByText('This June so far')).toBeInTheDocument()
})

it('omits the normal when normals is null', () => {
  render(<MonthCounters name="June" counts={{ SU: 3, hot30: 0, TR: 0, FD: 0, ID: 0 }} normals={null} soFar={false} />)
  expect(screen.getByText('summer days')).toBeInTheDocument()
  expect(screen.queryByText(/normal/)).not.toBeInTheDocument()
})

it('renders nothing when no counter qualifies', () => {
  const { container } = render(<MonthCounters name="June" counts={{ SU: 0, hot30: 0, TR: 0, FD: 0, ID: 0 }} normals={{ SU: 0, hot30: 0, TR: 0, FD: 0, ID: 0 }} soFar={false} />)
  expect(container).toBeEmptyDOMElement()
})
