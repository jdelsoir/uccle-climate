import { render, screen, fireEvent } from '@testing-library/react'
import DateNav from './DateNav'
import { vi } from 'vitest'

const min = new Date(1833, 0, 1)

test('shows date text + calendar card (month + day), steps days, picks a date', () => {
  const onChange = vi.fn()
  const date = new Date(2026, 5, 28)            // Sun 28 Jun 2026
  const max = new Date(2026, 5, 28)
  const { container } = render(<DateNav date={date} min={min} max={max} onChange={onChange} />)
  // date text (weekday + "28 June 2026")
  expect(screen.getByText('Sunday')).toBeInTheDocument()
  expect(screen.getByText('28 June 2026')).toBeInTheDocument()
  // calendar card shows month + day
  expect(screen.getByText('JUNE')).toBeInTheDocument()
  expect(screen.getByText('28')).toBeInTheDocument()   // card day number (own node)
  // next is disabled at max
  expect(screen.getByLabelText('Next day')).toBeDisabled()
  fireEvent.click(screen.getByLabelText('Previous day'))
  expect((onChange.mock.calls[0][0] as Date).getDate()).toBe(27)
  // calendar card is the accessible picker control
  expect(screen.getByRole('button', { name: /Change date/ })).toBeInTheDocument()
  // hidden date input drives onChange
  const input = container.querySelector('input[type="date"]') as HTMLInputElement
  fireEvent.change(input, { target: { value: '2000-01-15' } })
  expect((onChange.mock.calls.at(-1)![0] as Date).getFullYear()).toBe(2000)
})

test('clicking the calendar card opens the picker without throwing', () => {
  const onChange = vi.fn()
  const date = new Date(2026, 5, 28)
  const max = new Date(2026, 5, 28)
  const { container } = render(<DateNav date={date} min={min} max={max} onChange={onChange} />)
  // jsdom has no showPicker → falls back to focus()+click(); must not throw
  expect(() => fireEvent.click(screen.getByRole('button', { name: /Change date/ }))).not.toThrow()
  expect(container.querySelector('input[type="date"]')).toBeTruthy()
})

test('Today button jumps to today (max) and is disabled when already on today', () => {
  const onChange = vi.fn()
  const max = new Date(2026, 5, 28)             // today
  // viewing a past day → Today enabled
  const { rerender } = render(<DateNav date={new Date(2026, 5, 27)} min={min} max={max} onChange={onChange} />)
  const today = screen.getByRole('button', { name: /today/i })
  expect(today).not.toBeDisabled()
  fireEvent.click(today)
  expect((onChange.mock.calls.at(-1)![0] as Date).getDate()).toBe(28)   // jumped to max
  // viewing today → Today disabled
  rerender(<DateNav date={new Date(2026, 5, 28)} min={min} max={max} onChange={onChange} />)
  expect(screen.getByRole('button', { name: /today/i })).toBeDisabled()
})
