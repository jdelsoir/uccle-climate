export function rangePct(v: number, lo: number, hi: number): number {
  if (hi === lo) return 50
  return Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))
}

type Marker = { v: number; label: string; kind: 'tick' | 'dot' | 'diamond'; color?: string }

export default function RangeBar({ min, max, markers, summary }: {
  min: { v: number; label: string }; max: { v: number; label: string }; markers: Marker[]; summary: string
}) {
  const above = markers.filter(m => m.kind !== 'tick')   // dot / diamond → labels above the bar
  const below = markers.filter(m => m.kind === 'tick')   // tick (avg / normal) → label below the bar
  return (
    <div role="img" aria-label={summary} className="select-none">
      {/* above-bar labels (stacked so close values don't overlap) */}
      <div className="relative" style={{ height: above.length > 1 ? '2.1rem' : '1.15rem' }}>
        {above.map((m, i) => (
          <span key={i} aria-hidden
            style={{ left: `${rangePct(m.v, min.v, max.v)}%`, bottom: `${(above.length - 1 - i) * 1.05}rem` }}
            className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-muted">{m.label}</span>
        ))}
      </div>
      {/* flat track (warm tint) with marker glyphs */}
      <div className="relative h-2 bg-badge-bg">
        {markers.map((m, i) => {
          const left = `${rangePct(m.v, min.v, max.v)}%`
          if (m.kind === 'tick') return <span key={i} aria-hidden style={{ left }} className="absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-muted" />
          if (m.kind === 'diamond') return <span key={i} aria-hidden style={{ left }} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-warm" />
          return <span key={i} aria-hidden style={{ left }} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
        })}
      </div>
      {/* below-bar tick labels (avg / normal), positioned under their tick */}
      <div className="relative mt-1.5 h-4 text-[11px] text-muted">
        {below.map((m, i) => (
          <span key={i} aria-hidden style={{ left: `${rangePct(m.v, min.v, max.v)}%` }}
            className="absolute -translate-x-1/2 whitespace-nowrap">{m.label}</span>
        ))}
      </div>
      {/* record low / high end caps */}
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-accent">{min.label}</span>
        <span className="text-warm">{max.label}</span>
      </div>
    </div>
  )
}
