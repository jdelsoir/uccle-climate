import { render, screen } from '@testing-library/react'
import WarmingStrip from './WarmingStrip'

test('renders then/recent means, ranges, and signed delta', () => {
  render(<WarmingStrip label="A warming June 29"
    then={{ mean: 15.7, from: 1915, to: 1925 }}
    recent={{ mean: 19.3, from: 2015, to: 2025 }} delta={3.6} />)
  expect(screen.getByText('A warming June 29')).toBeInTheDocument()
  expect(screen.getByText('15.7 °C')).toBeInTheDocument()
  expect(screen.getByText('19.3 °C')).toBeInTheDocument()
  expect(screen.getByText('1915–1925')).toBeInTheDocument()
  expect(screen.getByText('2015–2025')).toBeInTheDocument()
  expect(screen.getByText('+3.6 °C')).toBeInTheDocument()
})
