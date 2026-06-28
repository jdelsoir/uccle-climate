import { render, screen, fireEvent } from '@testing-library/react'
import DateNav from './DateNav'
import { vi } from 'vitest'

test('shows label, steps days within bounds, picks a date', () => {
  const onChange = vi.fn()
  const date = new Date(2026, 5, 28)            // Sun 28 Jun 2026
  const min = new Date(1833, 0, 1), max = new Date(2026, 5, 28)
  render(<DateNav date={date} min={min} max={max} onChange={onChange} />)
  expect(screen.getByText(/Sunday · 28th · June · 2026/)).toBeInTheDocument()
  // next is disabled at max
  expect(screen.getByLabelText('Next day')).toBeDisabled()
  fireEvent.click(screen.getByLabelText('Previous day'))
  expect(onChange).toHaveBeenCalled()
  expect((onChange.mock.calls[0][0] as Date).getDate()).toBe(27)
  // date picker
  fireEvent.change(screen.getByLabelText('Pick a date'), { target: { value: '2000-01-15' } })
  expect((onChange.mock.calls.at(-1)![0] as Date).getFullYear()).toBe(2000)
})
