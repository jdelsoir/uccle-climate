import { render, screen } from '@testing-library/react'
import RangeBar, { rangePct } from './RangeBar'

test('rangePct maps and clamps', () => {
  expect(rangePct(5, 0, 10)).toBe(50)
  expect(rangePct(0, 0, 10)).toBe(0)
  expect(rangePct(10, 0, 10)).toBe(100)
  expect(rangePct(-5, 0, 10)).toBe(0)     // clamp low
  expect(rangePct(99, 0, 10)).toBe(100)   // clamp high
  expect(rangePct(5, 5, 5)).toBe(50)      // zero-width → midpoint
})

test('renders end-cap labels, marker labels, and an aria summary', () => {
  render(<RangeBar
    min={{ v: 5.3, label: '5.3° record low' }}
    max={{ v: 32.6, label: '32.6° record high' }}
    markers={[{ v: 17.9, label: 'avg 17.9°', kind: 'tick' }, { v: 26.8, label: 'high 26.8°', kind: 'diamond' }]}
    summary="High 26.8°, avg 17.9°, between 5.3° low and 32.6° high record" />)
  expect(screen.getByText('5.3° record low')).toBeInTheDocument()
  expect(screen.getByText('32.6° record high')).toBeInTheDocument()
  expect(screen.getByText('avg 17.9°')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /between 5.3° low and 32.6° high record/ })).toBeInTheDocument()
})
