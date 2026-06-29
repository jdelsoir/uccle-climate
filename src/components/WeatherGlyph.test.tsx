import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import WeatherGlyph from './WeatherGlyph'

describe('WeatherGlyph', () => {
  it('renders a decorative svg', () => {
    const { container } = render(<WeatherGlyph tone="warm" intensity={1} />)
    const svg = container.querySelector('svg')!
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })
  it('uses warm color for warm tone and accent for cool tone', () => {
    const warm = render(<WeatherGlyph tone="warm" intensity={1} />).container.querySelector('svg')!
    const cool = render(<WeatherGlyph tone="cool" intensity={1} />).container.querySelector('svg')!
    expect(warm.getAttribute('class')).toContain('text-warm')
    expect(cool.getAttribute('class')).toContain('text-accent')
  })
  it('scales opacity with intensity for warm tone', () => {
    const lo = render(<WeatherGlyph tone="warm" intensity={0} />).container.querySelector('svg')!
    const hi = render(<WeatherGlyph tone="warm" intensity={1} />).container.querySelector('svg')!
    expect(parseFloat(lo.style.opacity)).toBeLessThan(parseFloat(hi.style.opacity))
  })
  it('passes through className', () => {
    const svg = render(<WeatherGlyph tone="warm" intensity={1} className="absolute" />).container.querySelector('svg')!
    expect(svg.getAttribute('class')).toContain('absolute')
  })
})
