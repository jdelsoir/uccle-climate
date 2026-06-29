import { render, screen } from '@testing-library/react'
import About from './About'

test('cites sources and UHI caveat', () => {
  render(<About />)
  expect(screen.getByText(/GHCN-Daily/i)).toBeInTheDocument()
  expect(screen.getByText(/urban heat island/i)).toBeInTheDocument()
})

test('explains why Uccle and that no data is collected', () => {
  render(<About />)
  expect(screen.getByText(/longest continuous temperature record/i)).toBeInTheDocument()
  expect(screen.getByText(/we collect nothing/i)).toBeInTheDocument()
  expect(screen.getByText(/no analytics, no tracking/i)).toBeInTheDocument()
})
