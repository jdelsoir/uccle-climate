import { render, screen } from '@testing-library/react'
import App from './App'
test('renders Today tab by default and nav links', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /this day in history/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /trends/i })).toBeInTheDocument()
})
