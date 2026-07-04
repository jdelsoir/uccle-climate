import { COUNTER_ROWS, type CounterKey } from '../lib/counterRows'
import type { Summary } from '../types'

export default function YearCounters({ year, counters, incomplete }: {
  year: number; counters: Summary['counters']; incomplete: boolean
}) {
  const countFor = (k: CounterKey) => counters[k].find(p => p.year === year)?.n ?? 0
  const normalFor = (k: CounterKey) => {
    const vs = counters[k].filter(p => p.year >= 1991 && p.year <= 2020).map(p => p.n)
    return vs.length ? Math.round((vs.reduce((s, x) => s + x, 0) / vs.length) * 10) / 10 : null
  }
  const rows = COUNTER_ROWS
    .map(r => ({ ...r, count: countFor(r.key), normal: normalFor(r.key) }))
    .filter(r => (r.normal ?? 0) >= 0.5 || r.count > 0)
  if (!rows.length) return null
  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">This year {incomplete ? 'so far' : 'by the numbers'}</p>
      <ul className="border-t border-border divide-y divide-border">
        {rows.map(({ key, label, Icon, count, normal }) => (
          <li key={key} className="flex items-center gap-3 py-2.5">
            <Icon size={16} className="text-muted" aria-hidden />
            <span className="text-lg font-bold text-fg">{count}</span>
            <span className="flex-1 text-sm">{label}</span>
            {normal != null && <span className="text-xs text-muted">normal {normal.toFixed(1)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
