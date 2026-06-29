import { fmtTemp } from '../lib/format'

export default function WarmingStrip({ label, then, recent, delta }: {
  label: string; then: { mean: number; from: number; to: number }; recent: { mean: number; from: number; to: number }; delta: number
}) {
  const sign = delta > 0 ? '+' : ''
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-border bg-surface p-4 text-sm">
      <span className="text-[11px] uppercase tracking-[0.09em] text-muted">{label}</span>
      <span className="font-bold">{fmtTemp(then.mean)}</span>
      <span className="text-xs text-muted">{then.from}–{then.to}</span>
      <span aria-hidden className="text-warm">→</span>
      <span className="font-bold">{fmtTemp(recent.mean)}</span>
      <span className="text-xs text-muted">{recent.from}–{recent.to}</span>
      <span className="ml-auto bg-cal-header px-2 py-1 text-xs font-bold text-white">{sign}{delta.toFixed(1)} °C</span>
    </div>
  )
}
