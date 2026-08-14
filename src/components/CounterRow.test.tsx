import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sun } from 'lucide-react'
import CounterRow from './CounterRow'

const base = {
  label: 'tropical nights', Icon: Sun,
  title: 'What is a tropical night?',
  blurb: 'A night when the temperature never drops below 20 °C.',
  count: 7, normal: 1.4,
}

it('shows the count, label and normal, with the explanation hidden', () => {
  render(<ul><CounterRow {...base} open={false} onToggle={vi.fn()} /></ul>)
  expect(screen.getByText('7')).toBeInTheDocument()
  expect(screen.getByText('tropical nights')).toBeInTheDocument()
  expect(screen.getByText(/normal 1\.4/)).toBeInTheDocument()
  expect(screen.queryByText(base.title)).toBeNull()
})

it('the icon is a labelled button that reports toggles', () => {
  const onToggle = vi.fn()
  render(<ul><CounterRow {...base} open={false} onToggle={onToggle} /></ul>)
  const btn = screen.getByRole('button', { name: /what is a tropical night/i })
  expect(btn).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(btn)
  expect(onToggle).toHaveBeenCalledTimes(1)
})

it('shows title + explanation when open', () => {
  render(<ul><CounterRow {...base} open={true} onToggle={vi.fn()} /></ul>)
  expect(screen.getByText(base.title)).toBeInTheDocument()
  expect(screen.getByText(base.blurb)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /what is a tropical night/i })).toHaveAttribute('aria-expanded', 'true')
})

it('closes on Escape and on the popup close button', () => {
  const onToggle = vi.fn()
  render(<ul><CounterRow {...base} open={true} onToggle={onToggle} /></ul>)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onToggle).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: /close explanation/i }))
  expect(onToggle).toHaveBeenCalledTimes(2)
})

it('omits the normal when there is none', () => {
  render(<ul><CounterRow {...base} normal={null} open={false} onToggle={vi.fn()} /></ul>)
  expect(screen.queryByText(/normal/)).toBeNull()
})
