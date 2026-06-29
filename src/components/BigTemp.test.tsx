import { render, screen } from '@testing-library/react'
import BigTemp from './BigTemp'

test('renders the number and a smaller °C unit as separate nodes', () => {
  render(<BigTemp v={26.8} className="text-warm" />)
  expect(screen.getByText('26.8')).toBeInTheDocument()
  expect(screen.getByText('°C')).toBeInTheDocument()
})
