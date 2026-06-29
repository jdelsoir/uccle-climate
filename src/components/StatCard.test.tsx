import { render, screen, fireEvent } from '@testing-library/react'
import StatCard from './StatCard'

test('renders label, value, sub and applies valueClass', () => {
  render(<StatCard label="RECORD HIGH" value="32.6 °C" sub="1957" valueClass="text-warm" />)
  expect(screen.getByText('RECORD HIGH')).toBeInTheDocument()
  const v = screen.getByText('32.6 °C')
  expect(v).toHaveClass('text-warm')
  expect(screen.getByText('1957')).toBeInTheDocument()
})

test('is a button that fires when onClick set', () => {
  const onClick = vi.fn()
  render(<StatCard label="RECORD HIGH" value="32.6 °C" onClick={onClick} />)
  fireEvent.click(screen.getByRole('button', { name: /RECORD HIGH/ }))
  expect(onClick).toHaveBeenCalled()
})
