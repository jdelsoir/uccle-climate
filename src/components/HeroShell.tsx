import type { ReactNode } from 'react'
import WeatherGlyph from './WeatherGlyph'
import type { HeroTone } from '../lib/heroState'

export default function HeroShell({ tone, intensity, children }: {
  tone: HeroTone; intensity: number; children: ReactNode
}) {
  const grad = tone === 'warm' ? 'from-warm' : tone === 'cool' ? 'from-accent' : ''
  return (
    <div className="relative overflow-hidden border border-border bg-surface p-5">
      {grad && (
        <div aria-hidden
          className={`pointer-events-none absolute inset-0 z-0 bg-gradient-to-l ${grad} to-transparent`}
          style={{ opacity: 0.16 * Math.min(Math.max(intensity, 0), 1) }} />
      )}
      <WeatherGlyph tone={tone} intensity={intensity}
        className="pointer-events-none absolute right-0 top-1/2 z-0 h-[150%] w-[45%] -translate-y-1/2" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
