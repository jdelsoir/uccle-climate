import { render, screen, fireEvent } from '@testing-library/react'
import CalendarTile from './CalendarTile'

test('renders header, body, footer', () => {
  render(<CalendarTile header="JUNE" body={29} footer="MONDAY" />)
  expect(screen.getByText('JUNE')).toBeInTheDocument()
  expect(screen.getByText('29')).toBeInTheDocument()
  expect(screen.getByText('MONDAY')).toBeInTheDocument()
})

test('is a button with accessible name when onClick set, and fires', () => {
  const onClick = vi.fn()
  render(<CalendarTile header="JUNE" body={29} onClick={onClick} ariaLabel="Change date" />)
  const btn = screen.getByRole('button', { name: 'Change date' })
  fireEvent.click(btn)
  expect(onClick).toHaveBeenCalled()
})

test('is not a button when onClick omitted', () => {
  render(<CalendarTile header="JUNE" body="2026" />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
