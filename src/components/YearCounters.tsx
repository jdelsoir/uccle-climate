import { useState } from 'react'
import { COUNTER_ROWS, type CounterKey } from '../lib/counterRows'
import CounterRow from './CounterRow'
import type { Summary } from '../types'

export default function YearCounters({ year, counters, incomplete }: {
  year: number; counters: Summary['counters']; incomplete: boolean
}) {
  const [open, setOpen] = useState<CounterKey | null>(null)
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
    <div className="border border-border bg-surface p-4">
      <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">This year {incomplete ? 'so far' : 'by the numbers'}</p>
      <ul className="border-t border-border divide-y divide-border">
        {rows.map(({ key, ...row }) => (
          <CounterRow key={key} {...row}
            open={open === key} onToggle={() => setOpen(open === key ? null : key)} />
        ))}
      </ul>
    </div>
  )
}
