import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HeroShell from './HeroShell'

describe('HeroShell', () => {
  it('renders its children', () => {
    render(<HeroShell tone="warm" intensity={1}><p>hello</p></HeroShell>)
    expect(screen.getByText('hello')).toBeTruthy()
  })
  it('renders a warm gradient layer for warm tone', () => {
    const { container } = render(<HeroShell tone="warm" intensity={1}><span /></HeroShell>)
    expect(container.querySelector('.from-warm')).toBeTruthy()
  })
  it('renders no gradient layer for neutral tone', () => {
    const { container } = render(<HeroShell tone="neutral" intensity={0}><span /></HeroShell>)
    expect(container.querySelector('.from-warm')).toBeNull()
    expect(container.querySelector('.from-accent')).toBeNull()
  })
  it('always renders a decorative glyph', () => {
    const { container } = render(<HeroShell tone="cool" intensity={0.5}><span /></HeroShell>)
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
  })
})
