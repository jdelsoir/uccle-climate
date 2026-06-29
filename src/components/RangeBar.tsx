export function rangePct(v: number, lo: number, hi: number): number {
  if (hi === lo) return 50
  return Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))
}

type Marker = { v: number; label: string; kind: 'tick' | 'dot' | 'diamond'; color?: string }

export default function RangeBar({ min, max, markers, summary }: {
  min: { v: number; label: string }; max: { v: number; label: string }; markers: Marker[]; summary: string
}) {
  return (
    <div role="img" aria-label={summary} className="select-none">
      <div className="relative h-5">
        {markers.map((m, i) => (
          <span key={i} aria-hidden style={{ left: `${rangePct(m.v, min.v, max.v)}%` }}
            className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-muted">{m.label}</span>
        ))}
      </div>
      <div className="relative h-2 rounded-full bg-surface-2 ring-1 ring-border">
        {markers.map((m, i) => {
          const left = `${rangePct(m.v, min.v, max.v)}%`
          if (m.kind === 'tick') return <span key={i} aria-hidden style={{ left }} className="absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-muted" />
          if (m.kind === 'diamond') return <span key={i} aria-hidden style={{ left }} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-warm" />
          return <span key={i} aria-hidden style={{ left }} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-accent">{min.label}</span>
        <span className="text-warm">{max.label}</span>
      </div>
    </div>
  )
}
