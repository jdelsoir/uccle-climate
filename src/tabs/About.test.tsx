import { render, screen } from '@testing-library/react'
import About from './About'

test('cites sources and UHI caveat', () => {
  render(<About />)
  expect(screen.getByText(/GHCN-Daily/i)).toBeInTheDocument()
  expect(screen.getByText(/urban heat island/i)).toBeInTheDocument()
})
