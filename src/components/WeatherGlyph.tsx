import type { HeroTone } from '../lib/heroState'

function Sun({ intensity }: { intensity: number }) {
  const t = Math.min(Math.max(intensity, 0), 1)
  const len = 14 + 14 * t // rays grow with intensity
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180
    const r1 = 30, r2 = 30 + len
    return (
      <line key={i} x1={50 + r1 * Math.cos(a)} y1={50 + r1 * Math.sin(a)}
        x2={50 + r2 * Math.cos(a)} y2={50 + r2 * Math.sin(a)}
        stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    )
  })
  return <g fill="none">{rays}<circle cx={50} cy={50} r={22} fill="currentColor" fillOpacity={0.4} /></g>
}

function Snowflake() {
  const arms = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 * Math.PI) / 180
    const tx = 50 + 40 * Math.cos(a), ty = 50 + 40 * Math.sin(a)
    // two short branches near the tip
    const bx = 50 + 28 * Math.cos(a), by = 50 + 28 * Math.sin(a)
    const b1 = a + Math.PI / 4, b2 = a - Math.PI / 4
    return (
      <g key={i}>
        <line x1={50} y1={50} x2={tx} y2={ty} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        <line x1={bx} y1={by} x2={bx + 10 * Math.cos(b1)} y2={by + 10 * Math.sin(b1)} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={bx} y1={by} x2={bx + 10 * Math.cos(b2)} y2={by + 10 * Math.sin(b2)} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </g>
    )
  })
  return <g fill="none">{arms}<circle cx={50} cy={50} r={5} fill="currentColor" /></g>
}

export default function WeatherGlyph({ tone, intensity, className = '' }: {
  tone: HeroTone; intensity: number; className?: string
}) {
  const color = tone === 'cool' ? 'text-accent' : tone === 'warm' ? 'text-warm' : 'text-muted'
  // neutral keeps a faint constant presence; warm/cool fade in with intensity
  const opacity = tone === 'neutral' ? 0.18 : 0.25 + 0.55 * Math.min(Math.max(intensity, 0), 1)
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`${color} ${className}`} style={{ opacity }}>
      {tone === 'cool' ? <Snowflake /> : <Sun intensity={intensity} />}
    </svg>
  )
}
